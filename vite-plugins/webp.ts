import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import sharp from 'sharp'

/** 需要转成 WebP 的源图片扩展名（统一小写后比较）。 */
export const SOURCE_EXTENSIONS: readonly string[] = ['.png', '.jpg', '.jpeg', '.gif']

const WEBP_EXTENSION = '.webp'

/** 一张待转换图片：`rel` 用 posix 分隔符且不带前导 `/`，`url` 带前导 `/`。 */
export type ImageEntry = {
  sourceRel: string
  sourceAbs: string
  targetRel: string
  targetAbs: string
  sourceUrl: string
  targetUrl: string
}

/** 被跳过的源图片：`duplicate-target` 表示目标已被另一张源图占用，`target-exists` 表示 public 里已有同名 `.webp`。 */
export type SkippedImage = {
  sourceRel: string
  reason: 'duplicate-target' | 'target-exists'
}

type ScannedFile = {
  rel: string
  abs: string
}

/** 递归收集目录中的文件（跳过以 `.` 开头的目录与文件），按码点排序保证跨机器确定性。 */
function scanFiles(dirAbs: string, relPrefix = ''): ScannedFile[] {
  const files: ScannedFile[] = []
  const entries = fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
    const abs = path.join(dirAbs, entry.name)

    if (entry.isDirectory()) {
      files.push(...scanFiles(abs, rel))
    } else if (entry.isFile()) {
      files.push({ rel, abs })
    }
  }

  return files
}

/** 转义正则元字符，把文件 URL 当字面量匹配。 */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 占用表键：大小写不敏感文件系统上 `A.WEBP` 与 `A.webp` 是同一个目标，故统一小写，但输出的目标路径保留原始大小写。 */
function occupancyKey(rel: string): string {
  return rel.toLowerCase()
}

/**
 * 扫描 `public/` 下的图片，为每张源图算出对应的 `.webp` 目标路径。
 *
 * `public/` 中已存在的 `.webp` 先占位（同源图跳过，避免覆盖用户资源）；
 * 同名不同扩展名的源图只保留排序靠前的一张，其余记为重复目标。
 */
export function collectImageEntries(publicDir: string): {
  entries: ImageEntry[]
  skipped: SkippedImage[]
} {
  const files = fs.existsSync(publicDir) ? scanFiles(publicDir) : []

  const occupied = new Map<string, 'existing' | 'generated'>()
  for (const file of files) {
    if (path.posix.extname(file.rel).toLowerCase() === WEBP_EXTENSION) {
      occupied.set(occupancyKey(file.rel), 'existing')
    }
  }

  const entries: ImageEntry[] = []
  const skipped: SkippedImage[] = []

  for (const file of files) {
    const rawExtension = path.posix.extname(file.rel)
    if (!SOURCE_EXTENSIONS.includes(rawExtension.toLowerCase())) continue

    const targetRel = file.rel.slice(0, file.rel.length - rawExtension.length) + WEBP_EXTENSION
    const owner = occupied.get(occupancyKey(targetRel))

    if (owner) {
      skipped.push({
        sourceRel: file.rel,
        reason: owner === 'existing' ? 'target-exists' : 'duplicate-target',
      })
      continue
    }

    occupied.set(occupancyKey(targetRel), 'generated')
    entries.push({
      sourceRel: file.rel,
      sourceAbs: file.abs,
      targetRel,
      targetAbs: path.join(publicDir, targetRel),
      sourceUrl: `/${file.rel}`,
      targetUrl: `/${targetRel}`,
    })
  }

  return { entries, skipped }
}

/** 把代码中的源图片 URL 替换为 `.webp`（保留 query 与 hash）；没有任何改动时返回 `null`。 */
export function rewriteReferences(code: string, entries: ImageEntry[]): string | null {
  if (entries.length === 0) return null

  // 廉价预判：不含任何源扩展名就不必逐个替换
  const lowerCode = code.toLowerCase()
  if (!SOURCE_EXTENSIONS.some((extension) => lowerCode.includes(extension))) return null

  let result = code
  for (const entry of entries) {
    // 文件名边界：`/img/a.gif` 不能命中 `/img/a.gif.png` 或 `/img/a.gif2`，
    // 但 `?`、`#`、引号、括号与行尾仍应命中
    const pattern = new RegExp(escapeRegExp(entry.sourceUrl) + '(?![A-Za-z0-9._-])', 'g')
    result = result.replace(pattern, () => entry.targetUrl)
  }

  return result === code ? null : result
}

/** 编码参数：`quality` 为 WebP 质量（1-100），`effort` 为 libwebp 压缩投入（0-6）。 */
export type EncodeOptions = { quality: number; effort: number }

/**
 * 把单张源图转成 WebP。
 *
 * `metadata().pages > 1` 视为动图，必须显式传 `{ animated: true }` 才会保留所有帧；
 * 静图不带该选项，避免无用开销。失败时重抛带源文件路径的错误，便于构建期定位。
 */
export async function encodeWebp(sourceAbs: string, options: EncodeOptions): Promise<Buffer> {
  try {
    const { pages } = await sharp(sourceAbs).metadata()
    const pipeline = pages !== undefined && pages > 1 ? sharp(sourceAbs, { animated: true }) : sharp(sourceAbs)
    return await pipeline.webp({ quality: options.quality, effort: options.effort }).toBuffer()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`[fusim:webp] 转码失败 ${sourceAbs}：${message}`, { cause: error })
  }
}

/**
 * 算缓存文件路径。
 *
 * 源相对路径决定是哪个文件，`mtimeMs`/`size` 决定字节内容是否变过，
 * `quality`/`effort` 决定编码结果——任一变化都必须落到不同缓存文件，否则会复用旧字节。
 */
export function cachePathFor(
  cacheDir: string,
  entry: ImageEntry,
  stats: { mtimeMs: number; size: number },
  options: EncodeOptions,
): string {
  const key = `${entry.sourceRel}|${stats.mtimeMs}|${stats.size}|q${options.quality}e${options.effort}`
  return path.join(cacheDir, `${crypto.createHash('sha1').update(key).digest('hex')}.webp`)
}

/** 命中缓存直接读盘，否则转码后写入缓存目录；`cached` 标记是否走了缓存。 */
export async function ensureWebp(
  entry: ImageEntry,
  cacheDir: string,
  options: EncodeOptions,
): Promise<{ data: Buffer; cached: boolean }> {
  const stats = fs.statSync(entry.sourceAbs)
  const cachePath = cachePathFor(cacheDir, entry, stats, options)

  if (fs.existsSync(cachePath)) {
    return { data: fs.readFileSync(cachePath), cached: true }
  }

  const data = await encodeWebp(entry.sourceAbs, options)
  fs.mkdirSync(cacheDir, { recursive: true })
  // 先写临时文件再原子重命名：中途失败只留下无人读取的 `.tmp`，正式键上要么是完整文件要么不存在
  const tmpPath = `${cachePath}.tmp`
  fs.writeFileSync(tmpPath, data)
  fs.renameSync(tmpPath, cachePath)
  return { data, cached: false }
}

/** 编码缺省参数：quality / effort 与 sharp 默认值一致，构建间也保持稳定。 */
const DEFAULTS: EncodeOptions = { quality: 75, effort: 4 }

/** 每批并发转码的张数：动图动辄 43 MB，控制同时驻留内存的规模。 */
const BATCH_SIZE = 4

/** 一次成功转码的记录，`closeBundle` 只把成功项拷进 outDir。 */
type Converted = {
  entry: ImageEntry
  cachePath: string
  sourceBytes: number
  outputBytes: number
}

/** 报告用的人类可读字节数。 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units: string[] = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

/** 插件选项：转码质量 / 压缩投入 / 缓存目录。 */
export type WebpOptions = { quality?: number; effort?: number; cacheDir?: string }

/**
 * Vite 插件：build 时把 `public/` 里的图片转成 WebP 并改写全部引用。
 *
 * - `transform` / `transformIndexHtml` 把代码里的源图 URL 换成 `.webp`；
 * - `buildStart` 扫描并转码（命中磁盘缓存几乎零开销），SSR 构建只复用改写；
 * - `closeBundle` 把转好的文件拷进 outDir、删掉原位拷贝的源图并打印报告。
 *
 * dev 端的扫描 / 中间件由后续任务接线，这里不做任何事。
 */
export function webpImages(options: WebpOptions = {}): Plugin {
  const encodeOptions: EncodeOptions = {
    quality: options.quality ?? DEFAULTS.quality,
    effort: options.effort ?? DEFAULTS.effort,
  }

  let publicDir = ''
  let outDir = ''
  let command: 'build' | 'serve' = 'build'
  let cacheDir = ''
  let isSsr = false

  /** 扫描结果：永不删；改写与转码都从这里取。 */
  let entries: ImageEntry[] = []
  /** 成功转码的项。 */
  let converted: Converted[] = []
  /** 转码失败的源图：build 不改写它们（dist 保留原图），dev 无预转换不受影响。 */
  let failed = new Set<string>()
  /** 转码总耗时（含缓存读写），closeBundle 报告用。 */
  let conversionMs = 0

  /** 重新扫描 `public/`；被跳过的源图在这里警告说明原因。 */
  function refresh(): void {
    const scan = collectImageEntries(publicDir)
    entries = scan.entries
    for (const item of scan.skipped) {
      const reason = item.reason === 'target-exists' ? 'public 里已有同名 .webp' : '目标已被同名不同扩展名的源图占用'
      console.warn(`[fusim:webp] 跳过 ${item.sourceRel}：${reason}，保留原图。`)
    }
  }

  /** 参与改写的图片集：dev 无预转换，全部照改；build 只改转码成功过的（失败项改了会 404）。 */
  function rewriteSet(): ImageEntry[] {
    return command === 'build' ? entries.filter((entry) => !failed.has(entry.sourceRel)) : entries
  }

  return {
    name: 'fusim:webp',
    configResolved(config) {
      publicDir = config.publicDir
      outDir = path.resolve(config.root, config.build.outDir)
      command = config.command
      isSsr = Boolean(config.build.ssr)
      // 缓存目录默认放 node_modules/.cache：放 publicDir 里会被当成源图扫描
      cacheDir = options.cacheDir ?? path.join(config.root, 'node_modules/.cache/fusim-webp')
    },
    async buildStart() {
      // dev 冷启动不做事；dev 的扫描由 configureServer 接线（后续任务）
      if (command !== 'build') return
      refresh()
      // SSR 构建只复用改写（build:ssg 的预渲染页面也要引用 .webp），不转换、不拷贝、不删原图
      if (isSsr) return

      const startedAt = Date.now()
      for (let index = 0; index < entries.length; index += BATCH_SIZE) {
        await Promise.all(entries.slice(index, index + BATCH_SIZE).map(async (entry) => {
          try {
            const stats = fs.statSync(entry.sourceAbs)
            const { data } = await ensureWebp(entry, cacheDir, encodeOptions)
            converted.push({
              entry,
              cachePath: cachePathFor(cacheDir, entry, stats, encodeOptions),
              sourceBytes: stats.size,
              outputBytes: data.length,
            })
          } catch (error) {
            failed.add(entry.sourceRel)
            console.warn(error instanceof Error ? error.message : String(error))
          }
        }))
      }
      conversionMs = Date.now() - startedAt
    },
    transform(code: string) {
      return rewriteReferences(code, rewriteSet())
    },
    transformIndexHtml(html: string) {
      return rewriteReferences(html, rewriteSet()) ?? undefined
    },
    closeBundle() {
      if (command !== 'build' || isSsr) return

      for (const item of converted) {
        // public/ 资源不进打包图，直接把转好的文件落盘到 outDir
        const targetAbs = path.join(outDir, item.entry.targetRel)
        fs.mkdirSync(path.dirname(targetAbs), { recursive: true })
        fs.copyFileSync(item.cachePath, targetAbs)
        // 删掉 copyPublicDir 拷进来的源图，outDir 里只留 .webp
        const sourceAbs = path.join(outDir, item.entry.sourceRel)
        if (fs.existsSync(sourceAbs)) fs.unlinkSync(sourceAbs)
      }

      if (converted.length === 0) return
      const totalSource = converted.reduce((sum, item) => sum + item.sourceBytes, 0)
      const totalOutput = converted.reduce((sum, item) => sum + item.outputBytes, 0)
      const savedPercent = Math.max(0, Math.round((1 - totalOutput / totalSource) * 100))
      console.log(`[fusim:webp] ${converted.length} 张 · ${formatBytes(totalSource)} → ${formatBytes(totalOutput)} (-${savedPercent}%) · ${(conversionMs / 1000).toFixed(1)}s`)
      for (const item of converted) {
        console.log(`[fusim:webp]   ${item.entry.sourceRel}  ${formatBytes(item.sourceBytes)} → ${formatBytes(item.outputBytes)}`)
      }
    },
  }
}
