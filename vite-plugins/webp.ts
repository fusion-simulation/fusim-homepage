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

/** URL 起点边界：引号 / 括号 / 空白 / 赋值 / 冒号 / 串首，防止命中外部 CDN 或其它路径的中段（如 `/other/img/a.png`）。 */
const URL_START_BOUNDARY: string = `(?<=['"(\\\s=:]|^)`
/** URL 终点边界：`?` `#` 引号 括号 空白 / 串尾，并保留防前缀碰撞的断言（`/a.gif` 不能命中 `/a.gif2`）。 */
const URL_END_BOUNDARY: string = `(?=$|[?#'\")\\s])(?![A-Za-z0-9._-])`

/** 同一张源图要匹配的 URL 形态：原始字面量 + encodeURI 形态（浏览器请求带空格等字符的文件用的就是编码形态）。 */
function sourceUrlVariants(entry: ImageEntry): Array<{ source: string, target: string }> {
  const variants = [{ source: entry.sourceUrl, target: entry.targetUrl }]
  const encodedSource = encodeURI(entry.sourceUrl)
  if (encodedSource !== entry.sourceUrl) {
    variants.push({ source: encodedSource, target: encodeURI(entry.targetUrl) })
  }
  return variants
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
    for (const variant of sourceUrlVariants(entry)) {
      // 起点 / 终点都要落在 URL 边界上：`https://cdn…/img/a.png`、`/other/img/a.png`、裸 `img/a.png` 都不是本站引用
      const pattern = new RegExp(URL_START_BOUNDARY + escapeRegExp(variant.source) + URL_END_BOUNDARY, 'g')
      result = result.replace(pattern, () => variant.target)
    }
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
 * - `enforce: 'pre'`：transform 必须赶在 `vite:css` 把 `url(/img/…)` 换成 `__VITE_PUBLIC_ASSET__`
 *   占位符之前跑；MDX 插件同为 pre 且在 vite.config.ts 的数组里更靠前，编译后的 MDX 仍会先到我们这；
 * - `transform` / `transformIndexHtml` 把代码里的源图 URL 换成 `.webp`（依据 `buildStart` 定好的改写集）；
 * - `buildStart` 扫描并按阶段确定改写集：client 趟只含本趟成功转码的条目，SSR 趟只含缓存目录里
 *   已有文件的条目（两趟构建是独立进程，缓存目录是唯一共享的事实），dev 全量放行，实际字节
 *   由 `configureServer` 中间件按需补上；
 * - `configureServer`（dev）注册中间件：请求命中改写目标且 `public/` 里没有该 `.webp` 时，
 *   走 `ensureWebp` 取缓存或现转后直接回字节；watcher 在源图新增/删除时重扫；
 * - `closeBundle` 把转好的文件拷进 outDir、删掉原位拷贝的源图并打印报告，单张失败只警告不中断。
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

  /** 扫描结果：永不删，每次 buildStart 都重扫；转码与 SSR/dev 的改写集都从这里取。 */
  let entries: ImageEntry[] = []
  /** 本轮成功转码的项，每次 buildStart 清空：--watch 反复构建时不累加旧结果。 */
  let converted: Converted[] = []
  /** 本轮转码失败的源图（sourceRel），每轮 buildStart 清空、转码成功即除名，只作记录与告警定位。 */
  let failed = new Set<string>()
  /** 本轮转码总耗时（含缓存读写），closeBundle 报告用，每轮 buildStart 清零。 */
  let conversionMs = 0
  /**
   * 改写集合：`buildStart` 按（command × isSsr）算一次，`transform` / `transformIndexHtml` 只读这份。
   * client 趟 = 本趟成功转码（含缓存命中）的条目；SSR 趟 = 缓存文件已存在的条目；dev = 全部条目。
   */
  let rewriteEntries: ImageEntry[] = []

  /** 重新扫描 `public/`；被跳过的源图在这里警告说明原因。 */
  function refresh(): void {
    const scan = collectImageEntries(publicDir)
    entries = scan.entries
    for (const item of scan.skipped) {
      const reason = item.reason === 'target-exists' ? 'public 里已有同名 .webp' : '目标已被同名不同扩展名的源图占用'
      console.warn(`[fusim:webp] 跳过 ${item.sourceRel}：${reason}，保留原图。`)
    }
  }

  return {
    name: 'fusim:webp',
    // 前置到 vite:css 之前：CSS 里的 url() 要在它被换成 __VITE_PUBLIC_ASSET__ 占位符前改写掉
    enforce: 'pre',
    configResolved(config) {
      publicDir = config.publicDir
      outDir = path.resolve(config.root, config.build.outDir)
      command = config.command
      isSsr = Boolean(config.build.ssr)
      // 缓存目录默认放 node_modules/.cache：放 publicDir 里会被当成源图扫描
      cacheDir = options.cacheDir ?? path.join(config.root, 'node_modules/.cache/fusim-webp')
    },
    async buildStart() {
      refresh()
      // 每轮构建开始先清空上一轮状态：--watch 下同一实例会反复触发，不能累加旧结果
      converted = []
      failed = new Set<string>()
      conversionMs = 0

      if (command !== 'build') {
        // dev/serve：没有预转换，按需转码在 `configureServer` 中间件里做，全部条目放行改写
        rewriteEntries = entries
        return
      }

      if (isSsr) {
        // SSR 构建是独立进程，本趟不转码（converted 恒为空）；两趟构建唯一共享的事实是缓存目录，
        // 缓存文件存在即说明 client 趟转码成功——失败条目的缓存键带着不同的 mtime/size，自然落空。
        // 这样 client 趟保留的原图在预渲染页里保持原引用，不会 404
        rewriteEntries = entries.filter((entry) =>
          fs.existsSync(cachePathFor(cacheDir, entry, fs.statSync(entry.sourceAbs), encodeOptions)))
        return
      }

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
            // 转码成功就从 failed 除名：防同轮先败后成或上一轮残留影响判断
            failed.delete(entry.sourceRel)
          } catch (error) {
            failed.add(entry.sourceRel)
            console.warn(error instanceof Error ? error.message : String(error))
          }
        }))
      }
      conversionMs = Date.now() - startedAt
      // 改写集 = 本趟成功转码（含缓存命中）的条目，只从这里取，不经 entries；
      // 失败条目保持原引用，dist 保留可用原图，SSR 趟也能靠「缓存不存在」还原同一事实
      rewriteEntries = converted.map((item) => item.entry)
    },
    transform(code: string) {
      return rewriteReferences(code, rewriteEntries)
    },
    transformIndexHtml(html: string) {
      return rewriteReferences(html, rewriteEntries) ?? undefined
    },
    configureServer(server) {
      refresh()
      // 直接 use（不返回后置函数）才会排在 Vite 内部静态服务之前——public 里没有 .webp 文件，
      // 排在后面的话请求先被静态服务 404，永远轮不到这里
      server.middlewares.use(async (req, res, next) => {
        let pathname = ''
        try {
          // 只按 pathname 查找，query / hash 与改写规则无关；req.url 可能是 `*` 等非法形式，解析失败交回后续中间件
          pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
        } catch {
          return next()
        }
        const entry = entries.find((item) => item.targetUrl === pathname)
        // 未命中改写目标，或 public 里已有同名 .webp（用户自己放的，插件不接管），按原样继续走静态服务
        if (!entry || fs.existsSync(entry.targetAbs)) return next()

        try {
          const { data } = await ensureWebp(entry, cacheDir, encodeOptions)
          res.setHeader('Content-Type', 'image/webp')
          res.setHeader('Content-Length', data.length)
          res.setHeader('Cache-Control', 'no-cache')
          res.end(data)
        } catch (error) {
          // 转码失败不能把异常抛出中间件：connect 不会接住异步抛错，会让 dev server 整个崩掉，
          // 只回 500 文本把原因带出来即可。
          const message = error instanceof Error ? error.message : String(error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(message.startsWith('[fusim:webp]') ? message : `[fusim:webp] ${message}`)
        }
      })
      // 源图新增/删除时重扫让改写目标跟着变；change 不重扫——缓存键本身含 mtime，
      // 内容一变缓存必然 miss，请求来时按需重转
      server.watcher.on('all', (event, file) => {
        if ((event === 'add' || event === 'unlink') && file.startsWith(publicDir)) refresh()
      })
    },
    closeBundle() {
      if (command !== 'build' || isSsr) return

      for (const item of converted) {
        // 单张失败只警告并继续，不能拖垮其余文件，更不能吞掉报告
        try {
          // public/ 资源不进打包图，直接把转好的文件落盘到 outDir
          const targetAbs = path.join(outDir, item.entry.targetRel)
          fs.mkdirSync(path.dirname(targetAbs), { recursive: true })
          fs.copyFileSync(item.cachePath, targetAbs)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[fusim:webp] 拷贝失败 ${item.entry.sourceRel}：${message}，保留原图备查。`)
          continue
        }
        // 拷贝成功的才删掉 copyPublicDir 拷进来的源图；删除失败同样只警告，outDir 里多留一份原图无害
        try {
          const sourceAbs = path.join(outDir, item.entry.sourceRel)
          if (fs.existsSync(sourceAbs)) fs.unlinkSync(sourceAbs)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[fusim:webp] 删除原图失败 ${item.entry.sourceRel}：${message}`)
        }
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
