import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, mock, test } from 'node:test'
import sharp from 'sharp'
import {
  cachePathFor,
  collectImageEntries,
  encodeWebp,
  ensureWebp,
  formatPercent,
  rewriteReferences,
  setSharpLoader,
  WebpTool,
} from './webp.ts'

const dirs: string[] = []
function makePublicDir(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-'))
  dirs.push(dir)
  for (const rel of files) {
    const abs = path.join(dir, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, '')
  }
  return dir
}
after(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true })
})

test('收集大小写不敏感的图片并换小写 .webp 扩展名', () => {
  const dir = makePublicDir([
    'assets/img/A.PNG',
    'assets/img/b.JPG',
    'assets/img/c.jpeg',
    'assets/img/d.gif',
    'favicon.svg',
    'assets/other/e.webp',
    '.hidden/f.png',
  ])
  const { entries } = collectImageEntries(dir)
  assert.deepEqual(entries.map((e) => e.targetRel).sort(), [
    'assets/img/A.webp',
    'assets/img/b.webp',
    'assets/img/c.webp',
    'assets/img/d.webp',
  ])
  assert.equal(entries[0].sourceUrl.startsWith('/assets/img/'), true)
  assert.equal(
    entries.find((e) => e.sourceRel === 'assets/img/A.PNG')?.targetAbs,
    path.join(dir, 'assets/img/A.webp'),
  )
})

test('同名不同扩展名只保留一个，并记录 duplicate-target', () => {
  const dir = makePublicDir(['x/a.gif', 'x/a.png'])
  const { entries, skipped } = collectImageEntries(dir)
  assert.equal(entries.length, 1)
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.png', reason: 'duplicate-target' }])
})

test('public 里已有的 .webp 使同源图片被跳过', () => {
  const dir = makePublicDir(['x/a.png', 'x/a.webp'])
  const { entries, skipped } = collectImageEntries(dir)
  assert.deepEqual(entries, [])
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.png', reason: 'target-exists' }])
})

test('软链接 .webp 也占目标（target-exists），软链目录不跟随', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-'))
  dirs.push(dir)
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-out-'))
  dirs.push(outside)
  fs.writeFileSync(path.join(outside, 'real.txt'), '')
  fs.writeFileSync(path.join(outside, 'z.png'), '')
  fs.mkdirSync(path.join(dir, 'x'))
  // 软链到 public 外的 a.webp 同样是用户要发布的文件：a.png 不该转出同名目标然后把它覆盖
  fs.symlinkSync(path.join(outside, 'real.txt'), path.join(dir, 'x/a.webp'))
  fs.writeFileSync(path.join(dir, 'x/a.png'), '')
  // 指向目录的软链不跟随：dirlink/z.png 不能被卷进扫描
  fs.symlinkSync(outside, path.join(dir, 'dirlink'))

  const { entries, skipped } = collectImageEntries(dir)
  assert.deepEqual(entries, [])
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.png', reason: 'target-exists' }])
})

test('改写引用且保留 query 与 hash', () => {
  const dir = makePublicDir(['img/a.gif'])
  const { entries } = collectImageEntries(dir)
  const code = 'src="/img/a.gif" x=url(/img/a.gif?v=1) y="/img/a.gif#t" z="/img/b.gif"'
  assert.equal(
    rewriteReferences(code, entries),
    'src="/img/a.webp" x=url(/img/a.webp?v=1) y="/img/a.webp#t" z="/img/b.gif"',
  )
})

test('没有可改写内容时返回 null', () => {
  const { entries } = collectImageEntries(makePublicDir(['img/a.gif']))
  assert.equal(rewriteReferences('const a = 1', entries), null)
  assert.equal(rewriteReferences('', []), null)
})

test('URL 边界：外部 URL、其它路径与裸文件名不改写', () => {
  const { entries } = collectImageEntries(makePublicDir(['img/a.png']))
  const code = 'a="https://cdn.example/img/a.png" b="/other/img/a.png" c=img/a.png'
  assert.equal(rewriteReferences(code, entries), null)
})

test('percent-encoded 形态与原始字面量都改写，保留 query 与 hash', () => {
  const { entries } = collectImageEntries(makePublicDir(['x/space photo.png']))
  assert.equal(
    rewriteReferences('href="/x/space%20photo.png?v=2#frag"', entries),
    'href="/x/space%20photo.webp?v=2#frag"',
  )
  assert.equal(
    rewriteReferences('href="/x/space photo.png"', entries),
    'href="/x/space photo.webp"',
  )
})

test('只替换完整文件名，前缀相同的更长引用不被污染', () => {
  const dir = makePublicDir(['img/a.gif', 'img/a.gif.png'])
  const { entries } = collectImageEntries(dir)
  assert.equal(entries.length, 2)
  const code = 'src="/img/a.gif" x="/img/a.gif.png" y=/img/a.gif2'
  assert.equal(
    rewriteReferences(code, entries),
    'src="/img/a.webp" x="/img/a.gif.webp" y=/img/a.gif2',
  )
})

test('引号、括号、query、hash 与行尾等边界仍然可匹配', () => {
  const { entries } = collectImageEntries(makePublicDir(['img/a.gif']))
  const code = `src='/img/a.gif' a=url(/img/a.gif?v=1) b="/img/a.gif#t" c="/img/b.gif"\n/img/a.gif`
  assert.equal(
    rewriteReferences(code, entries),
    `src='/img/a.webp' a=url(/img/a.webp?v=1) b="/img/a.webp#t" c="/img/b.gif"\n/img/a.webp`,
  )
})

test('目录按码点排序，优先级不受本地化排序影响', () => {
  const { entries, skipped } = collectImageEntries(makePublicDir(['x/a.PNG', 'x/a.gif']))
  assert.deepEqual(
    entries.map((e) => e.sourceRel),
    ['x/a.PNG'],
  )
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.gif', reason: 'duplicate-target' }])
})

test('已存在的 .webp 扩展名大小写不同也算占用目标', () => {
  const { entries, skipped } = collectImageEntries(makePublicDir(['x/A.PNG', 'x/A.WEBP']))
  assert.deepEqual(entries, [])
  assert.deepEqual(skipped, [{ sourceRel: 'x/A.PNG', reason: 'target-exists' }])
})

async function writeGif(abs: string, frames: number) {
  const images = await Promise.all(
    Array.from({ length: frames }, (_, i) =>
      sharp({
        create: { width: 64, height: 48, channels: 3, background: { r: i * 40, g: 80, b: 160 } },
      })
        .png()
        .toBuffer(),
    ),
  )
  const gif = await sharp(images, { join: { animated: true } })
    .gif()
    .toBuffer()
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, gif)
}

test('动图转完仍是多帧', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'anim.gif')
  await writeGif(abs, 3)
  const out = await encodeWebp(abs, { quality: 75, effort: 4 })
  const meta = await sharp(out, { animated: true }).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.pages, 3)
})

test('静图转成单帧 webp', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'still.png')
  await sharp({ create: { width: 32, height: 32, channels: 3, background: '#123456' } })
    .png()
    .toFile(abs)
  const out = await encodeWebp(abs, { quality: 75, effort: 4 })
  const meta = await sharp(out).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.pages ?? 1, 1)
})

test('编码前按 EXIF 方向自动摆正，缓存键含语义版本', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'phone.jpg')
  // 16x8 的横幅照片带 orientation 6（顺转 90° 后才是正确朝向），摆正后应为 8x16
  await sharp({ create: { width: 16, height: 8, channels: 3, background: '#654321' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toFile(abs)
  assert.equal((await sharp(abs).metadata()).orientation, 6)
  const { entries } = collectImageEntries(dir)
  const output = await encodeWebp(entries[0].sourceAbs, { quality: 75, effort: 4 })
  const meta = await sharp(output).metadata()
  assert.equal(meta.width, 8)
  assert.equal(meta.height, 16)
  // 输出不再带 orientation 标签：像素已经被物理旋转，不需要陪葬的元数据
  assert.equal(meta.orientation ?? null, null)

  // 缓存键的语义版本：本测试重建旧格式（无版本段）的键，两者必须不同，否则旧逻辑的缓存会被复用
  const cacheDir = path.join(dir, 'cache')
  const stats = fs.statSync(abs)
  const options = { quality: 75, effort: 4 }
  const oldFormatted = crypto
    .createHash('sha1')
    .update(`${entries[0].sourceRel}|${stats.mtimeMs}|${stats.size}|q75e4`)
    .digest('hex')
  assert.notEqual(
    cachePathFor(cacheDir, entries[0], stats, options),
    path.join(cacheDir, `${oldFormatted}.webp`),
  )
})

test('坏图报错带文件路径且保留原始错误', async () => {
  const dir = makePublicDir(['bad.png']) // 空文件
  const abs = path.join(dir, 'bad.png')
  await assert.rejects(
    () => encodeWebp(abs, { quality: 75, effort: 4 }),
    (err: Error) => {
      assert.equal(err.message.includes(abs), true)
      assert.equal(err.cause instanceof Error, true)
      return true
    },
  )
})

test('缓存键随 mtime / size / 质量 / effort 变化，命中后不重复编码', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'c.png')
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#fff' } })
    .png()
    .toFile(abs)
  const { entries } = collectImageEntries(dir)
  const cacheDir = path.join(dir, 'cache')
  const options = { quality: 75, effort: 4 }
  const first = await ensureWebp(entries[0], cacheDir, options)
  const second = await ensureWebp(entries[0], cacheDir, options)
  assert.equal(first.cached, false)
  assert.equal(second.cached, true)
  const stats = fs.statSync(abs)
  const other = cachePathFor(cacheDir, entries[0], stats, { quality: 90, effort: 4 })
  assert.notEqual(cachePathFor(cacheDir, entries[0], stats, options), other)
  assert.notEqual(
    cachePathFor(cacheDir, entries[0], { ...stats, mtimeMs: stats.mtimeMs + 1000 }, options),
    cachePathFor(cacheDir, entries[0], stats, options),
  )
  assert.notEqual(
    cachePathFor(cacheDir, entries[0], stats, { ...options, effort: 5 }),
    cachePathFor(cacheDir, entries[0], stats, options),
  )
  assert.notEqual(
    cachePathFor(cacheDir, entries[0], { ...stats, size: stats.size + 1 }, options),
    cachePathFor(cacheDir, entries[0], stats, options),
  )
})

test('缓存写入是原子的：rename 失败时正式键上不留半截文件', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'atomic.png')
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#abcdef' } })
    .png()
    .toFile(abs)
  const { entries } = collectImageEntries(dir)
  const cacheDir = path.join(dir, 'cache')
  const options = { quality: 75, effort: 4 }
  const cachePath = cachePathFor(cacheDir, entries[0], fs.statSync(abs), options)

  const rename = mock.method(fs, 'renameSync', () => {
    throw new Error('rename boom')
  })
  try {
    await assert.rejects(() => ensureWebp(entries[0], cacheDir, options), /rename boom/)
  } finally {
    rename.mock.restore()
  }
  assert.equal(fs.existsSync(cachePath), false)

  // 恢复后重跑应正常落盘，且不残留临时文件
  const retried = await ensureWebp(entries[0], cacheDir, options)
  assert.equal(retried.cached, false)
  assert.deepEqual(
    fs.readdirSync(cacheDir).filter((name) => name.endsWith('.tmp')),
    [],
  )
})

test('sharp 懒加载失败：报安装提示并带源文件路径', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'lazy.png')
  await writePng(abs)
  const original = setSharpLoader(async () => {
    throw new Error('Cannot find package "sharp"')
  })
  try {
    await assert.rejects(
      () => encodeWebp(abs, { quality: 75, effort: 4 }),
      (error: Error) => {
        assert.equal(
          error.message.startsWith(
            '[fusim:webp] 无法加载 sharp（请先 npm i -D sharp）：Cannot find package "sharp"',
          ),
          true,
          error.message,
        )
        assert.equal(error.message.includes(abs), true, error.message)
        assert.equal(error.cause instanceof Error, true)
        return true
      },
    )
  } finally {
    setSharpLoader(original)
  }
  // 恢复默认加载器后照常能编码
  const output = await encodeWebp(abs, { quality: 75, effort: 4 })
  assert.equal((await sharp(output).metadata()).format, 'webp')
})

async function writePng(abs: string) {
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#abcdef' } })
    .png()
    .toFile(abs)
}

/// dev 中间件测试：直接调 tool.middleware，不起真实 HTTP 服务
function makeRes() {
  const res: {
    statusCode: number
    headers: Record<string, unknown>
    body: unknown
    setHeader: (key: string, value: unknown) => void
    end: (data: unknown) => void
  } = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value
    },
    end(data) {
      this.body = data
    },
  }
  return res
}

/** 造一个绑好目录的工具实例；build 用 serve=false，dev 用 serve=true。 */
function makeTool(
  publicDir: string,
  options: { serve?: boolean; cacheDir?: string } = {},
): WebpTool {
  // 缓存目录必须在 public 之外，否则会被当成源图扫描进产物
  const cacheDir = options.cacheDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-cache-'))
  if (!options.cacheDir) dirs.push(cacheDir)
  const tool = new WebpTool({ serve: options.serve, cacheDir })
  tool.bind({ publicDir, cacheDir })
  return tool
}

function makeRequest(tool: WebpTool, nextCalls: string[]) {
  return (url: string) => {
    const res = makeRes()
    const next = () => void nextCalls.push('/next')
    return tool.middleware({ url }, res, next).then(() => res)
  }
}

test('dev 中间件：改写目标按需转码回 WebP 字节且命中缓存，非目标放行', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const tool = makeTool(dir, { serve: true })
  await tool.prepare()
  const nextCalls: string[] = []
  const request = makeRequest(tool, nextCalls)

  const first = await request('/img/a.webp?v=1')
  assert.equal(first.statusCode, 200)
  assert.equal(first.headers['Content-Type'], 'image/webp')
  assert.equal(first.headers['Cache-Control'], 'no-cache')
  assert.equal(first.headers['Content-Length'], (first.body as Buffer).length)
  assert.equal((await sharp(first.body as Buffer).metadata()).format, 'webp')
  // 第二次请求（不带 query）应命中缓存，字节完全一致
  const second = await request('/img/a.webp')
  assert.deepEqual(second.body, first.body)
  // 非改写目标（源图本身）放行给静态服务
  await request('/img/a.png')
  assert.deepEqual(nextCalls, ['/next'])
})

test('dev 中间件：public 已有 .webp 放行、坏图回 500 文本、新增源图重扫后可用', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  fs.writeFileSync(path.join(dir, 'broken.png'), '')
  const tool = makeTool(dir, { serve: true })
  await tool.prepare()
  const nextCalls: string[] = []
  const request = makeRequest(tool, nextCalls)

  // 坏图：转码失败不能把异常抛出中间件，回 500 文本
  const failed = await request('/broken.webp')
  assert.equal(failed.statusCode, 500)
  assert.equal(String(failed.body).startsWith('[fusim:webp]'), true)

  // public 里出现的 .webp 属于用户资源，插件不接管
  await writePng(path.join(dir, 'img/a.webp'))
  await request('/img/a.webp')
  assert.equal(nextCalls.length, 1)

  // 新增源图：重扫间隔内还没进改写集，先放行
  await writePng(path.join(dir, 'img/c.png'))
  await request('/img/c.webp')
  assert.equal(nextCalls.length, 2)

  // 过了重扫间隔，中间件补扫后按需服务新图片
  await new Promise((resolve) => setTimeout(resolve, 1100))
  const added = await request('/img/c.webp')
  assert.equal(added.statusCode, 200)
  assert.equal((await sharp(added.body as Buffer).metadata()).format, 'webp')
  assert.equal(nextCalls.length, 2)
})

test('dev：改写集随重扫同步，新增/删除源图即时生效', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const tool = makeTool(dir, { serve: true })
  await tool.prepare()
  assert.equal(tool.rewrite('src="/img/a.png"'), 'src="/img/a.webp"')

  await writePng(path.join(dir, 'img/new.png'))
  // 没有重扫时旧改写集不含新文件
  assert.equal(tool.rewrite('src="/img/new.png"'), 'src="/img/new.png"')
  tool.rescan()
  assert.equal(tool.rewrite('src="/img/new.png"'), 'src="/img/new.webp"')

  fs.unlinkSync(path.join(dir, 'img/new.png'))
  tool.rescan()
  assert.equal(tool.rewrite('src="/img/new.png"'), 'src="/img/new.png"')
})

test('build：prepare 后 rewrite 改写引用，CSS 里的 url() 与编译后的模块源码同样处理', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const tool = makeTool(dir)
  await tool.prepare()
  assert.equal(
    tool.rewrite('a { background: url(/img/a.png) }'),
    'a { background: url(/img/a.webp) }',
  )
  assert.equal(tool.rewrite('src="/img/a.png"'), 'src="/img/a.webp"')
  assert.equal(tool.rewrite('const a = 1'), 'const a = 1')
})

test('build：转码失败的图片不参与改写（原图保留）', async () => {
  const dir = makePublicDir(['img/broken.png']) // 空文件
  const tool = makeTool(dir)
  const warnings: unknown[][] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => void warnings.push(args)
  try {
    await tool.prepare()
  } finally {
    console.warn = origWarn
  }
  assert.equal(tool.rewrite('src="/img/broken.png"'), 'src="/img/broken.png"')
  assert.equal(warnings.length, 1)
})

test('build：assets 只发 .webp，失败的源图与其它 public 文件原样', async () => {
  const dir = makePublicDir(['img/broken.png', 'favicon.svg'])
  await writePng(path.join(dir, 'img/a.png'))
  const tool = makeTool(dir)
  const origWarn = console.warn
  console.warn = () => {}
  try {
    await tool.prepare()
  } finally {
    console.warn = origWarn
  }

  const assets = tool.assets()
  const names = assets.map((asset) => asset.name).sort()
  assert.deepEqual(names, ['favicon.svg', 'img/a.webp', 'img/broken.png'])
  const webp = assets.find((asset) => asset.name === 'img/a.webp')
  assert.ok(webp, '产物里应包含 img/a.webp')
  assert.equal((await sharp(webp.data).metadata()).format, 'webp')
})

test('同一实例连续两轮构建，报告张数不累加', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const tool = makeTool(dir)
  const logs: unknown[][] = []
  const origLog = console.log
  console.log = (...args: unknown[]) => void logs.push(args)
  try {
    await tool.prepare()
    tool.report()
    await tool.prepare()
    tool.report()
  } finally {
    console.log = origLog
  }

  const reportLines = logs.map((args) => String(args[0]))
  const counts = reportLines.filter((line) => line.includes('张'))
  assert.equal(counts.length, 2)
  assert.equal(
    counts.every((line) => line.includes('1 张')),
    true,
  )
  assert.equal(
    reportLines.some((line) => line.includes('2 张')),
    false,
  )
})

test('报告百分比：聚合变大时输出 +N%，不钳为 0', () => {
  assert.equal(formatPercent(1000, 100), '-90%')
  assert.equal(formatPercent(1000, 1070), '+7%')
})

test('exclude 里的源图保持原样：不转码、不记跳过', () => {
  const dir = makePublicDir(['og-image.png', 'logos/fusim-logo-512.png', 'assets/img/a.png'])
  const { entries, skipped } = collectImageEntries(dir, [
    '/og-image.png',
    '/logos/fusim-logo-512.png',
  ])
  assert.deepEqual(
    entries.map((entry) => entry.sourceRel),
    ['assets/img/a.png'],
  )
  assert.deepEqual(skipped, [])
})

test('WebpTool 的 exclude 项按原图发进产物，不产生 .webp', async () => {
  const dir = makePublicDir(['og-image.png', 'assets/img/a.png'])
  fs.writeFileSync(path.join(dir, 'og-image.png'), 'PNG')
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-cache-'))
  dirs.push(cacheDir)

  const tool = new WebpTool({ serve: true, exclude: ['/og-image.png'] })
  tool.bind({ publicDir: dir, cacheDir })
  await tool.prepare()

  assert.deepEqual(
    tool.entries.map((entry) => entry.sourceRel),
    ['assets/img/a.png'],
  )
  const assets = tool.assets()
  assert.deepEqual(assets.map((asset) => asset.name).sort(), ['assets/img/a.png', 'og-image.png'])
  assert.equal(assets.find((asset) => asset.name === 'og-image.png')?.data.toString(), 'PNG')
})
