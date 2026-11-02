import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Compiler } from 'webpack'

/** sharp 构造函数类型：仅类型层面引用，运行时由懒加载动态 import 提供。 */
type SharpFactory = typeof import('sharp')['default']

/** 当前 sharp 加载器：默认动态 import 并缓存；测试可注入替代实现模拟包缺失 / 原生二进制损坏。 */
let sharpLoader: () => Promise<SharpFactory> = async () => (await import('sharp')).default
/** 已加载的 sharp 构造函数；换加载器或加载失败时清空以便重试。 */
let sharpFactory: SharpFactory | undefined

/** 注入替代的 sharp 加载器并返回原加载器（用于恢复），让 webpack.config.mjs 的加载不依赖 sharp 的好坏。 */
export function setSharpLoader(loader: () => Promise<SharpFactory>): () => Promise<SharpFactory> {
  const previous = sharpLoader
  sharpLoader = loader
  sharpFactory = undefined
  return previous
}

/** 懒加载 sharp：成功即缓存；失败抛出带安装提示的错误（cause 保留原始异常），不拖死整个配置加载。 */
async function loadSharp(): Promise<SharpFactory> {
  if (sharpFactory) return sharpFactory
  try {
    sharpFactory = await sharpLoader()
  } catch (error) {
    sharpFactory = undefined
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`[fusim:webp] 无法加载 sharp（请先 npm i -D sharp）：${message}`, {
      cause: error,
    })
  }
  return sharpFactory
}

/** 需要转成 WebP 的源图片扩展名（统一小写后比较）。 */
export const SOURCE_EXTENSIONS: readonly string[] = ['.png', '.jpg', '.jpeg', '.gif']

const WEBP_EXTENSION = '.webp'

/** 缓存键的语义版本：编码逻辑变化（如新增 EXIF 自动摆正、多宽度变体）时升版，旧产物自然全部失效不会误复用。 */
export const CACHE_KEY_VERSION = 'v3'

/** 一张待转换图片：`rel` 用 posix 分隔符且不带前导 `/`，`url` 带前导 `/`。 */
export type ImageEntry = {
  sourceRel: string
  sourceAbs: string
  targetRel: string
  targetAbs: string
  sourceUrl: string
  targetUrl: string
}

/**
 * 被跳过的源图片：
 * - `target-exists`：public 里已有同名 `.webp`（用户文件优先，不覆盖）；
 * - `duplicate-target`：目标已被另一张源图占用；
 * - `variant-conflict`：某个变体目标已被占用——整组响应式图片放弃，只发原图。
 */
export type SkippedImage = {
  sourceRel: string
  reason: 'duplicate-target' | 'target-exists' | 'variant-conflict'
  /** `variant-conflict` 时被占用的变体路径。 */
  conflictRel?: string
}

/** 变体目标路径：`img/a.webp` → `img/a-480.webp`，与运行时 `imageVariantUrl` 的命名规则一致。 */
export function variantRelFor(targetRel: string, width: number): string {
  return `${targetRel.slice(0, targetRel.length - WEBP_EXTENSION.length)}-${width}${WEBP_EXTENSION}`
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
      // 软链到目录的不跟随，避免把 public 外（乃至成环）的目录树卷进来
      if (!entry.isSymbolicLink()) files.push(...scanFiles(abs, rel))
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      // 软链文件也参与占用：public 里软链出的 a.webp 同样是用户要发布的文件，
      // isFile() 对软链返回 false，漏掉会把同名源图转出来覆盖它
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
const URL_START_BOUNDARY: string = String.raw`(?<=['"(\s=:]|^)`
/** URL 终点边界：`?` `#` 引号 括号 空白 / 串尾，并保留防前缀碰撞的断言（`/a.gif` 不能命中 `/a.gif2`）。 */
const URL_END_BOUNDARY: string = String.raw`(?=$|[?#'\")\s])(?![A-Za-z0-9._-])`

/** 同一张源图要匹配的 URL 形态：原始字面量 + encodeURI 形态（浏览器请求带空格等字符的文件用的就是编码形态）。 */
function sourceUrlVariants(entry: ImageEntry): Array<{ source: string; target: string }> {
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
 * `exclude` 里的源 URL 完全不参与（不转码、不占目标、不记跳过），原图由 assets() 原样发进产物。
 */
export function collectImageEntries(
  publicDir: string,
  exclude: readonly string[] = [],
  variantWidths: readonly number[] = [],
): {
  entries: ImageEntry[]
  skipped: SkippedImage[]
} {
  const files = fs.existsSync(publicDir) ? scanFiles(publicDir) : []
  const excluded = new Set(exclude)

  const occupied = new Map<string, 'existing' | 'source' | 'variant'>()
  for (const file of files) {
    if (path.posix.extname(file.rel).toLowerCase() === WEBP_EXTENSION) {
      occupied.set(occupancyKey(file.rel), 'existing')
    }
  }

  const entries: ImageEntry[] = []
  const skipped: SkippedImage[] = []

  for (const file of files) {
    // 排除项在扩展名过滤之前出局：既不算可转码源图，也不占用同名目标
    if (excluded.has(`/${file.rel}`)) continue

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

    // 变体名先占位校验：被 public 文件或别的源图占用时整组放弃，
    // 否则 srcSet 会指向别人的内容（宽度描述符对不上，等于坏图）
    const variantRels = variantWidths.map((width) => variantRelFor(targetRel, width))
    const conflictRel = variantRels.find((rel) => occupied.has(occupancyKey(rel)))
    if (conflictRel) {
      skipped.push({ sourceRel: file.rel, reason: 'variant-conflict', conflictRel })
      continue
    }

    occupied.set(occupancyKey(targetRel), 'source')
    for (const rel of variantRels) occupied.set(occupancyKey(rel), 'variant')
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
      const pattern = new RegExp(
        URL_START_BOUNDARY + escapeRegExp(variant.source) + URL_END_BOUNDARY,
        'g',
      )
      result = result.replace(pattern, () => variant.target)
    }
  }

  return result === code ? null : result
}

/**
 * 编码参数：`quality` 为 WebP 质量（1-100），`effort` 为 libwebp 压缩投入（0-6）；
 * `width` 是变体的目标宽度，缺省表示按源宽出 base。`withoutEnlargement` 保证小图不被放大。
 */
export type EncodeOptions = { quality: number; effort: number; width?: number }

/**
 * 把单张源图转成 WebP。
 *
 * `metadata().pages > 1` 视为动图，必须显式传 `{ animated: true }` 才会保留所有帧；
 * 静图不带该选项，避免无用开销。失败时重抛带源文件路径的错误，便于构建期定位。
 */
export async function encodeWebp(sourceAbs: string, options: EncodeOptions): Promise<Buffer> {
  try {
    const factory = await loadSharp()
    const { pages } = await factory(sourceAbs).metadata()
    const pipeline =
      pages !== undefined && pages > 1 ? factory(sourceAbs, { animated: true }) : factory(sourceAbs)
    // 自动按 EXIF 方向摆正（rotate 无参）：输出会丢 orientation 标签，必须在编码前把朝向应用到像素上；
    // 变体在摆正之后按目标宽度缩放（动图会逐帧缩放并保留帧数）
    const oriented =
      options.width === undefined
        ? pipeline.rotate()
        : pipeline.rotate().resize({ width: options.width, withoutEnlargement: true })
    return await oriented.webp({ quality: options.quality, effort: options.effort }).toBuffer()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('[fusim:webp] 无法加载 sharp（请先 npm i -D sharp）')) {
      // 加载失败的专属文案已由 loadSharp 拼好，这里补上出事的源文件路径，保留 cause 链不再包「转码失败」
      const cause = error instanceof Error ? error : new Error(message)
      throw new Error(`${message}（源文件：${sourceAbs}）`, { cause })
    }
    throw new Error(`[fusim:webp] 转码失败 ${sourceAbs}：${message}`, { cause: error })
  }
}

/**
 * 算缓存文件路径。
 *
 * 源相对路径决定是哪个文件，`mtimeMs`/`size` 决定字节内容是否变过，
 * `quality`/`effort` 决定编码结果，语义版本位标识编码逻辑的代次（如引入 EXIF 自动摆正）。
 * 任一变化都必须落到不同缓存文件，否则会复用旧字节。
 */
export function cachePathFor(
  cacheDir: string,
  entry: ImageEntry,
  stats: { mtimeMs: number; size: number },
  options: EncodeOptions,
): string {
  const widthKey = options.width === undefined ? 'w-base' : `w${options.width}`
  const key = `${CACHE_KEY_VERSION}|${entry.sourceRel}|${stats.mtimeMs}|${stats.size}|q${options.quality}e${options.effort}|${widthKey}`
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

/** 编码缺省参数：本项目的自选默认，构建间保持稳定（sharp 自身的 WebP quality 默认是 80，75 是有意的选择）。 */
const DEFAULTS: EncodeOptions = { quality: 75, effort: 4 }

/**
 * 同时在编的任务上限（base 与每个变体都算一个任务）：
 * 多帧动图动辄 40 MB，不限流会让多个宽度同时驻留内存。
 */
export const ENCODE_CONCURRENCY = 4

/** 一个已写入缓存的编码结果。 */
type EncodedFile = { cachePath: string; outputBytes: number }

/**
 * 一次成功的整组转码：base + 变体。
 * 任一变体失败整组都不进 converted——srcSet 里的候选必须成套存在，否则就是半套坏图。
 */
type Converted = {
  entry: ImageEntry
  base: EncodedFile
  variants: Array<{ width: number; rel: string; file: EncodedFile }>
  sourceBytes: number
}

/** 读源图宽度：动图的 `metadata().height` 是「帧高 × 帧数」，宽度才是候选过滤要的值。 */
async function sourceWidth(sourceAbs: string): Promise<number> {
  try {
    const factory = await loadSharp()
    const { width } = await factory(sourceAbs).metadata()
    if (typeof width !== 'number' || width <= 0) throw new Error('读不到图片宽度')
    return width
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`[fusim:webp] 读取尺寸失败 ${sourceAbs}：${message}`, { cause: error })
  }
}

/** 统一的错误文案：错误对象取 message，其余按字符串。 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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

/** 报告用的增减百分比：不钳取 0 %，聚合真的变大时如实输出如 +7%（转换本身仍无条件）。 */
export function formatPercent(sourceBytes: number, outputBytes: number): string {
  const percent = Math.round((1 - outputBytes / sourceBytes) * 100)
  return percent >= 0 ? `-${percent}%` : `+${-percent}%`
}

/**
 * 插件 / loader 选项：转码质量、压缩投入、缓存目录；`serve` 表示跑在 dev server 下；
 * `exclude` 是不参与转码、原样发进产物的源 URL（精确匹配，含前导 `/`）。
 */
export type WebpToolOptions = {
  quality?: number
  effort?: number
  cacheDir?: string
  serve?: boolean
  exclude?: readonly string[]
  /** 响应式图片的候选宽度（与运行时 helper 共用同一份常量）；空数组表示只出 base。 */
  variantWidths?: readonly number[]
}

/** 插件在 apply 时注入的目录：loader / 中间件 / 资源发布共用同一份。 */
export type WebpBindings = {
  publicDir: string
  cacheDir: string
}

/** 默认缓存目录（相对项目根目录）：放 publicDir 里会被当成源图扫描。 */
export const DEFAULT_CACHE_DIR = 'node_modules/.cache/fusim-webp'

/** dev 中间件重扫的最小间隔：一批图片请求只重扫一次。 */
const RESCAN_INTERVAL_MS = 1000

/**
 * WebP 管线的全部状态与动作，打包器无关的部分都留在这里：
 *
 * - `prepare()`：每次编译前扫描 `public/`，build 时把源图转码进缓存目录，
 *   并把「本趟转码成功」的条目定为改写集（失败条目保持原引用，产物里保留可用原图）；
 * - `rewrite()`：把模块 / HTML 里的源图 URL 换成 `.webp`；
 * - `assets()`：build 阶段真正要写进产物的文件（转好的 `.webp`，其余 public 文件原样）；
 * - `middleware()`：dev 下请求命中改写目标且 `public/` 里没有该 `.webp` 时，取缓存或现转后回字节。
 */
export class WebpTool {
  readonly encodeOptions: EncodeOptions
  /** 是否跑在 dev server 下：没有预转换，字节由中间件按需补。 */
  readonly serve: boolean
  readonly cacheDirOption: string | undefined
  /** 不参与转码的源 URL：OG 图等必须保持原格式的文件。 */
  readonly exclude: readonly string[]
  /** 响应式图片的候选宽度：base 之外的 `name-<width>.webp`。 */
  readonly variantWidths: readonly number[]

  private bindings: WebpBindings | undefined
  /** 扫描结果：每次 rescan 都重扫，转码与改写集都从这里取。 */
  entries: ImageEntry[] = []
  /** 本轮成功转码的项，每次 prepare 清空：watch 反复构建时不累加旧结果。 */
  private converted: Converted[] = []
  /** 本轮转码总耗时（含缓存读写），报告用。 */
  private conversionMs = 0
  /** 改写集合：build = 本趟成功转码的条目；serve = 全部条目（冲突组除外）。 */
  rewriteEntries: ImageEntry[] = []
  /** 变体 URL → (条目, 宽度)：dev 中间件按需生成变体时用。 */
  private variantIndex = new Map<string, { entry: ImageEntry; width: number }>()
  private lastScanAt = 0

  constructor(options: WebpToolOptions = {}) {
    this.encodeOptions = {
      quality: options.quality ?? DEFAULTS.quality,
      effort: options.effort ?? DEFAULTS.effort,
    }
    this.serve = options.serve ?? false
    this.cacheDirOption = options.cacheDir
    this.exclude = options.exclude ?? []
    this.variantWidths = options.variantWidths ?? []
  }

  /** 由 webpack 插件注入目录；重复调用幂等。 */
  bind(bindings: WebpBindings): void {
    this.bindings = bindings
    this.lastScanAt = 0
  }

  private get env(): WebpBindings {
    if (!this.bindings) throw new Error('[fusim:webp] 目录尚未绑定：插件必须先 apply 到 webpack')
    return this.bindings
  }

  /** 重扫 `public/`；dev 下改写集必须与扫描实时同步，否则新增图片永远不被改写、删掉的还能被改写。 */
  rescan(): void {
    const scan = collectImageEntries(this.env.publicDir, this.exclude, this.variantWidths)
    this.entries = scan.entries
    this.lastScanAt = Date.now()
    for (const item of scan.skipped) {
      const reason =
        item.reason === 'target-exists'
          ? 'public 里已有同名 .webp'
          : item.reason === 'duplicate-target'
            ? '目标已被同名不同扩展名的源图占用'
            : `变体目标 ${item.conflictRel ?? ''} 已被占用`
      console.warn(`[fusim:webp] 跳过 ${item.sourceRel}：${reason}，保留原图。`)
    }

    // 变体索引：所有宽度的名字都登记（实际是否生成由源宽决定），dev 中间件据此找源图
    this.variantIndex.clear()
    for (const entry of this.entries) {
      for (const width of this.variantWidths) {
        this.variantIndex.set(`/${variantRelFor(entry.targetRel, width)}`, { entry, width })
      }
    }

    // dev 改写集 = 全部条目（实际字节由中间件按需补上）；冲突组已被 entries 排除
    if (this.serve) this.rewriteEntries = this.entries
  }

  /** 每次 webpack 编译前调用：扫描 +（build）读尺寸、转 base 与变体。 */
  async prepare(): Promise<void> {
    this.rescan()
    // 每轮构建开始先清空上一轮状态：watch 下同一实例会反复触发，不能累加旧结果
    this.converted = []
    this.conversionMs = 0

    if (this.serve) return

    const startedAt = Date.now()

    // 1) 每张源图只读一次元数据，过滤出小于源宽的候选（小图不放大、不产变体）
    const plans: Array<{ entry: ImageEntry; widths: number[] }> = []
    for (const entry of this.entries) {
      try {
        const width = await sourceWidth(entry.sourceAbs)
        plans.push({ entry, widths: this.variantWidths.filter((candidate) => candidate < width) })
      } catch (error) {
        // 读不到尺寸就没有可信的候选集：不参与改写，原图保留
        console.warn(`[fusim:webp] 跳过 ${entry.sourceRel}：${messageOf(error)}`)
      }
    }

    // 2) 编码任务（base + 每个变体）展平后统一限流：多帧 GIF 的多个宽度同时在编会吃满内存
    const jobs: Array<{ entry: ImageEntry; width: number | undefined }> = []
    for (const plan of plans) {
      jobs.push({ entry: plan.entry, width: undefined })
      for (const width of plan.widths) jobs.push({ entry: plan.entry, width })
    }

    const encoded = new Map<ImageEntry, Array<{ width?: number; file: EncodedFile }>>()
    for (const plan of plans) encoded.set(plan.entry, [])
    const failures = new Map<ImageEntry, string>()

    for (let index = 0; index < jobs.length; index += ENCODE_CONCURRENCY) {
      await Promise.all(
        jobs.slice(index, index + ENCODE_CONCURRENCY).map(async ({ entry, width }) => {
          try {
            const stats = fs.statSync(entry.sourceAbs)
            const options =
              width === undefined ? this.encodeOptions : { ...this.encodeOptions, width }
            const { data } = await ensureWebp(entry, this.env.cacheDir, options)
            encoded.get(entry)?.push({
              width,
              file: {
                cachePath: cachePathFor(this.env.cacheDir, entry, stats, options),
                outputBytes: data.length,
              },
            })
          } catch (error) {
            // 记住首个失败：整组作废，产物里保留原图，引用也保持原样
            const detail = messageOf(error)
            failures.set(entry, width === undefined ? detail : `${width}w ${detail}`)
          }
        }),
      )
    }

    for (const plan of plans) {
      const files = encoded.get(plan.entry) ?? []
      const failure = failures.get(plan.entry)
      if (failure || files.length !== plan.widths.length + 1) {
        console.warn(
          `[fusim:webp] 放弃 ${plan.entry.sourceRel} 的响应式图片：${failure ?? '编码任务未全部完成'}（保留原图）`,
        )
        continue
      }

      const base = files.find((item) => item.width === undefined)?.file
      if (!base) continue

      this.converted.push({
        entry: plan.entry,
        base,
        variants: files
          .filter((item): item is { width: number; file: EncodedFile } => item.width !== undefined)
          .map((item) => ({
            width: item.width,
            rel: variantRelFor(plan.entry.targetRel, item.width),
            file: item.file,
          }))
          .sort((a, b) => a.width - b.width),
        sourceBytes: fs.statSync(plan.entry.sourceAbs).size,
      })
    }

    this.conversionMs = Date.now() - startedAt
    // 改写集只从整组成立的条目里取：半套图片不参与改写
    this.rewriteEntries = this.converted.map((item) => item.entry)
  }

  /** 把模块 / HTML 里的源图 URL 换成 `.webp`；没有改动时原样返回。 */
  rewrite(code: string): string {
    return rewriteReferences(code, this.rewriteEntries) ?? code
  }

  /** build：要写进产物的文件。整组成立的图片发 base + 变体，其余 public 文件原样拷贝。 */
  assets(): Array<{ name: string; data: Buffer }> {
    const bySource = new Map(this.converted.map((item) => [item.entry.sourceRel, item]))
    const emitted = new Set<string>()
    const output: Array<{ name: string; data: Buffer }> = []

    const push = (name: string, data: Buffer) => {
      const key = occupancyKey(name)
      // 扫描阶段的占用表已经排除了冲突；这里再兜一层，宁可构建失败也不发出重名资源
      if (emitted.has(key)) throw new Error(`[fusim:webp] 产物文件名冲突：${name}`)
      emitted.add(key)
      output.push({ name, data })
    }

    for (const file of scanFiles(this.env.publicDir)) {
      const converted = bySource.get(file.rel)
      // 缓存文件读不到就让构建失败：引用已经改成 .webp，产物里缺文件比报错更糟
      if (!converted) {
        push(file.rel, fs.readFileSync(file.abs))
        continue
      }

      // 源图整组换成 base + 变体，原图不再发布
      push(converted.entry.targetRel, fs.readFileSync(converted.base.cachePath))
      for (const variant of converted.variants) {
        push(variant.rel, fs.readFileSync(variant.file.cachePath))
      }
    }

    return output
  }

  /** 打印转码报告：只统计真正写进产物的条目。 */
  report(): void {
    if (this.converted.length === 0) return

    const outputBytesOf = (item: Converted) =>
      item.base.outputBytes +
      item.variants.reduce((sum, variant) => sum + variant.file.outputBytes, 0)
    const totalSource = this.converted.reduce((sum, item) => sum + item.sourceBytes, 0)
    const totalOutput = this.converted.reduce((sum, item) => sum + outputBytesOf(item), 0)

    console.log(
      `[fusim:webp] ${this.converted.length} 张 · ${formatBytes(totalSource)} → ${formatBytes(totalOutput)} (${formatPercent(totalSource, totalOutput)}) · ${(this.conversionMs / 1000).toFixed(1)}s`,
    )
    for (const item of this.converted) {
      const variants = item.variants.length > 0 ? `（+${item.variants.length} 个变体）` : ''
      console.log(
        `[fusim:webp]   ${item.entry.sourceRel}  ${formatBytes(item.sourceBytes)} → ${formatBytes(outputBytesOf(item))}${variants}`,
      )
    }
  }

  /**
   * dev 中间件。必须挂在静态服务之前（config 里 `middlewares.unshift`）：
   * `public/` 里没有 `.webp` 文件，排在后面的话请求先被静态服务 404，永远轮不到这里。
   */
  async middleware(
    req: { url?: string },
    res: {
      statusCode: number
      setHeader(name: string, value: string | number): void
      end(data?: Buffer | string): void
    },
    next: () => void,
  ): Promise<void> {
    let pathname = ''
    try {
      // 只按 pathname 查找，query / hash 与改写规则无关；req.url 可能是 `*` 等非法形式，解析失败交回后续中间件
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    } catch {
      return next()
    }

    // base URL 与 `name-<width>.webp` 变体 URL 都解析到同一张源图
    const resolve = (url: string): { entry: ImageEntry; width?: number } | undefined => {
      const base = this.entries.find((item) => item.targetUrl === url)
      if (base) return { entry: base, width: undefined }
      return this.variantIndex.get(url)
    }

    let hit = resolve(pathname)
    // dev 里新增的源图不会触发重扫：命中 .webp 就补扫一次，让新文件立刻可用
    if (
      !hit &&
      pathname.endsWith(WEBP_EXTENSION) &&
      Date.now() - this.lastScanAt > RESCAN_INTERVAL_MS
    ) {
      this.rescan()
      hit = resolve(pathname)
    }
    // 未命中改写目标，或 public 里已有同名 .webp（用户自己放的，插件不接管），按原样继续走静态服务
    if (!hit || fs.existsSync(hit.entry.targetAbs)) return next()

    try {
      const options =
        hit.width === undefined ? this.encodeOptions : { ...this.encodeOptions, width: hit.width }
      const { data } = await ensureWebp(hit.entry, this.env.cacheDir, options)
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
  }
}

/**
 * webpack 插件：编译前转码 + 把 public/ 与转好的 `.webp` 一起写进产物。
 *
 * 与 Vite 版的差别只在接线方式：改写改由 `webp-loader.ts` 在每个模块上做，
 * `index.html` 由 `webpack.config.mjs` 的 templateContent 调 `tool.rewrite`，
 * public 的拷贝换成 `processAssets` 阶段 `emitAsset`（转码成功的图片只发 `.webp`，不再发原图）。
 */
export class WebpPlugin {
  readonly tool: WebpTool

  constructor(options: WebpToolOptions = {}) {
    this.tool = new WebpTool(options)
  }

  /** dev server 中间件（箭头函数，绑定好 this 供 `setupMiddlewares` 直接 unshift）。 */
  readonly middleware = (
    req: { url?: string },
    res: {
      statusCode: number
      setHeader(name: string, value: string | number): void
      end(data?: Buffer | string): void
    },
    next: () => void,
  ): Promise<void> => this.tool.middleware(req, res, next)

  apply(compiler: Compiler): void {
    const root = compiler.context
    registerWebpTool(root, this.tool)

    compiler.hooks.beforeCompile.tapPromise('fusim:webp', async () => {
      this.tool.bind({
        publicDir: path.join(root, 'public'),
        cacheDir: path.resolve(root, this.tool.cacheDirOption ?? DEFAULT_CACHE_DIR),
      })
      await this.tool.prepare()
    })

    compiler.hooks.thisCompilation.tap('fusim:webp', (compilation) => {
      const { Compilation, sources } = compilation.compiler.webpack

      compilation.hooks.processAssets.tap(
        { name: 'fusim:webp', stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          // dev 产物走内存，public 由 dev server 的静态服务提供，不在这里发
          if (this.tool.serve) return

          for (const asset of this.tool.assets()) {
            compilation.emitAsset(asset.name, new sources.RawSource(asset.data))
          }
          this.tool.report()
        },
      )
    })
  }
}

/**
 * 插件实例登记表：loader 只拿得到项目根目录，靠它找回插件里那个已经 bind 过目录的实例
 * （改写集在 `prepare()` 里定，loader 只读）。
 */
const registeredTools = new Map<string, WebpTool>()

/** 由 `WebpPlugin.apply` 登记，保证 loader 与插件共用同一份状态。 */
export function registerWebpTool(root: string, tool: WebpTool): void {
  registeredTools.set(path.resolve(root), tool)
}

/** loader 侧取插件实例；配置里漏了插件时直接报错，比静默不改写好。 */
export function webpToolFor(root: string): WebpTool {
  const tool = registeredTools.get(path.resolve(root))
  if (!tool)
    throw new Error(
      '[fusim:webp] 找不到 WebpPlugin 实例：webpack 配置的 plugins 里必须有 new WebpPlugin()',
    )
  return tool
}
