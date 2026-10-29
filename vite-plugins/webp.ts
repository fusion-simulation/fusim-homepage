import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
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
