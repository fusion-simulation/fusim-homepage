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
  rewriteReferences,
  setSharpLoader,
  webpImages,
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
after(() => { for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true }) })

test('收集大小写不敏感的图片并换小写 .webp 扩展名', () => {
  const dir = makePublicDir(['assets/img/A.PNG', 'assets/img/b.JPG', 'assets/img/c.jpeg', 'assets/img/d.gif', 'favicon.svg', 'assets/other/e.webp', '.hidden/f.png'])
  const { entries } = collectImageEntries(dir)
  assert.deepEqual(entries.map((e) => e.targetRel).sort(), ['assets/img/A.webp', 'assets/img/b.webp', 'assets/img/c.webp', 'assets/img/d.webp'])
  assert.equal(entries[0].sourceUrl.startsWith('/assets/img/'), true)
  assert.equal(entries.find((e) => e.sourceRel === 'assets/img/A.PNG')?.targetAbs, path.join(dir, 'assets/img/A.webp'))
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
  assert.equal(rewriteReferences(code, entries), 'src="/img/a.webp" x=url(/img/a.webp?v=1) y="/img/a.webp#t" z="/img/b.gif"')
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
  assert.equal(rewriteReferences('href="/x/space%20photo.png?v=2#frag"', entries), 'href="/x/space%20photo.webp?v=2#frag"')
  assert.equal(rewriteReferences('href="/x/space photo.png"', entries), 'href="/x/space photo.webp"')
})

test('只替换完整文件名，前缀相同的更长引用不被污染', () => {
  const dir = makePublicDir(['img/a.gif', 'img/a.gif.png'])
  const { entries } = collectImageEntries(dir)
  assert.equal(entries.length, 2)
  const code = 'src="/img/a.gif" x="/img/a.gif.png" y=/img/a.gif2'
  assert.equal(rewriteReferences(code, entries), 'src="/img/a.webp" x="/img/a.gif.webp" y=/img/a.gif2')
})

test('引号、括号、query、hash 与行尾等边界仍然可匹配', () => {
  const { entries } = collectImageEntries(makePublicDir(['img/a.gif']))
  const code = `src='/img/a.gif' a=url(/img/a.gif?v=1) b="/img/a.gif#t" c="/img/b.gif"\n/img/a.gif`
  assert.equal(rewriteReferences(code, entries), `src='/img/a.webp' a=url(/img/a.webp?v=1) b="/img/a.webp#t" c="/img/b.gif"\n/img/a.webp`)
})

test('目录按码点排序，优先级不受本地化排序影响', () => {
  const { entries, skipped } = collectImageEntries(makePublicDir(['x/a.PNG', 'x/a.gif']))
  assert.deepEqual(entries.map((e) => e.sourceRel), ['x/a.PNG'])
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.gif', reason: 'duplicate-target' }])
})

test('已存在的 .webp 扩展名大小写不同也算占用目标', () => {
  const { entries, skipped } = collectImageEntries(makePublicDir(['x/A.PNG', 'x/A.WEBP']))
  assert.deepEqual(entries, [])
  assert.deepEqual(skipped, [{ sourceRel: 'x/A.PNG', reason: 'target-exists' }])
})

async function writeGif(abs: string, frames: number) {
  const images = await Promise.all(Array.from({ length: frames }, (_, i) =>
    sharp({ create: { width: 64, height: 48, channels: 3, background: { r: i * 40, g: 80, b: 160 } } }).png().toBuffer()))
  const gif = await sharp(images, { join: { animated: true } }).gif().toBuffer()
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
  await sharp({ create: { width: 32, height: 32, channels: 3, background: '#123456' } }).png().toFile(abs)
  const out = await encodeWebp(abs, { quality: 75, effort: 4 })
  const meta = await sharp(out).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.pages ?? 1, 1)
})

test('编码前按 EXIF 方向自动摆正，缓存键含语义版本', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'phone.jpg')
  // 16x8 的横幅照片带 orientation 6（顺转 90° 后才是正确朝向），摆正后应为 8x16
  await sharp({ create: { width: 16, height: 8, channels: 3, background: '#654321' } }).jpeg().withMetadata({ orientation: 6 }).toFile(abs)
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
  const oldFormatted = crypto.createHash('sha1').update(`${entries[0].sourceRel}|${stats.mtimeMs}|${stats.size}|q75e4`).digest('hex')
  assert.notEqual(cachePathFor(cacheDir, entries[0], stats, options), path.join(cacheDir, `${oldFormatted}.webp`))
})

test('坏图报错带文件路径且保留原始错误', async () => {
  const dir = makePublicDir(['bad.png'])  // 空文件
  const abs = path.join(dir, 'bad.png')
  await assert.rejects(() => encodeWebp(abs, { quality: 75, effort: 4 }), (err: Error) => {
    assert.equal(err.message.includes(abs), true)
    assert.equal(err.cause instanceof Error, true)
    return true
  })
})

test('缓存键随 mtime / size / 质量 / effort 变化，命中后不重复编码', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'c.png')
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#fff' } }).png().toFile(abs)
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
  assert.notEqual(cachePathFor(cacheDir, entries[0], { ...stats, mtimeMs: stats.mtimeMs + 1000 }, options), cachePathFor(cacheDir, entries[0], stats, options))
  assert.notEqual(cachePathFor(cacheDir, entries[0], stats, { ...options, effort: 5 }), cachePathFor(cacheDir, entries[0], stats, options))
  assert.notEqual(cachePathFor(cacheDir, entries[0], { ...stats, size: stats.size + 1 }, options), cachePathFor(cacheDir, entries[0], stats, options))
})

test('缓存写入是原子的：rename 失败时正式键上不留半截文件', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'atomic.png')
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#abcdef' } }).png().toFile(abs)
  const { entries } = collectImageEntries(dir)
  const cacheDir = path.join(dir, 'cache')
  const options = { quality: 75, effort: 4 }
  const cachePath = cachePathFor(cacheDir, entries[0], fs.statSync(abs), options)

  const rename = mock.method(fs, 'renameSync', () => { throw new Error('rename boom') })
  try {
    await assert.rejects(() => ensureWebp(entries[0], cacheDir, options), /rename boom/)
  } finally {
    rename.mock.restore()
  }
  assert.equal(fs.existsSync(cachePath), false)

  // 恢复后重跑应正常落盘，且不残留临时文件
  const retried = await ensureWebp(entries[0], cacheDir, options)
  assert.equal(retried.cached, false)
  assert.deepEqual(fs.readdirSync(cacheDir).filter((name) => name.endsWith('.tmp')), [])
})

test('sharp 懒加载失败：报安装提示并带源文件路径', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'lazy.png')
  await writePng(abs)
  const original = setSharpLoader(async () => { throw new Error('Cannot find package "sharp"') })
  try {
    await assert.rejects(() => encodeWebp(abs, { quality: 75, effort: 4 }), (error: Error) => {
      assert.equal(error.message.startsWith('[fusim:webp] 无法加载 sharp（请先 npm i -D sharp）：Cannot find package "sharp"'), true, error.message)
      assert.equal(error.message.includes(abs), true, error.message)
      assert.equal(error.cause instanceof Error, true)
      return true
    })
  } finally {
    setSharpLoader(original)
  }
  // 恢复默认加载器后照常能编码
  const output = await encodeWebp(abs, { quality: 75, effort: 4 })
  assert.equal((await sharp(output).metadata()).format, 'webp')
})

async function writePng(abs: string) {
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#abcdef' } }).png().toFile(abs)
}

/// dev 中间件测试：用假 server 对象捕获 configureServer 里注册的处理器，不起真实 HTTP 服务
function makeFakeServer() {
  let handler: (...args: unknown[]) => unknown = () => {}
  const watcherHandlers = new Map<string, (...args: unknown[]) => void>()
  const wsSent: unknown[] = []
  return {
    get handler() { return handler },
    middlewares: {
      use(fn: (...args: unknown[]) => unknown) { handler = fn },
    },
    watcher: {
      on(event: string, fn: (...args: unknown[]) => void) { watcherHandlers.set(event, fn) },
    },
    ws: { send: (message: unknown) => void wsSent.push(message) },
    get wsSent() { return wsSent },
    notify(event: string, file: string) { watcherHandlers.get('all')?.(event, file) },
  }
}

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
    setHeader(key, value) { this.headers[key] = value },
    end(data) { this.body = data },
  }
  return res
}

test('dev 中间件：改写目标按需转码回 WebP 字节且命中缓存，非目标放行', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const plugin = makePlugin(dir, 'serve')
  const server = makeFakeServer()
  ;(plugin.configureServer as any)(server)

  const nextCalls: string[] = []
  const next = () => void nextCalls.push('/next')
  const request = (url: string): Promise<any> => {
    const res = makeRes()
    return Promise.resolve(server.handler({ url }, res, next)).then(() => res)
  }

  const first = await request('/img/a.webp?v=1')
  assert.equal(first.statusCode, 200)
  assert.equal(first.headers['Content-Type'], 'image/webp')
  assert.equal(first.headers['Cache-Control'], 'no-cache')
  assert.equal(first.headers['Content-Length'], (first.body as Buffer).length)
  assert.equal((await sharp(first.body as Buffer).metadata()).format, 'webp')
  // 第二次请求（不带 query）应命中缓存，字节完全一致
  const second = await request('/img/a.webp')
  assert.deepEqual(second.body, first.body)
  // 非改写目标（源图本身）放行给 Vite 静态服务
  await request('/img/a.png')
  assert.deepEqual(nextCalls, ['/next'])
})

test('dev 中间件：public 已有 .webp 放行、坏图回 500 文本、watcher add 重扫而 change 不扫', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  fs.writeFileSync(path.join(dir, 'broken.png'), '')
  const plugin = makePlugin(dir, 'serve')
  const server = makeFakeServer()
  ;(plugin.configureServer as any)(server)
  const nextCalls: string[] = []
  const next = () => void nextCalls.push('/next')
  const request = (url: string): Promise<any> => {
    const res = makeRes()
    return Promise.resolve(server.handler({ url }, res, next)).then(() => res)
  }

  // 坏图：转码失败不能把异常抛出中间件，回 500 文本
  const failed = await request('/broken.webp')
  assert.equal(failed.statusCode, 500)
  assert.equal(String(failed.body).startsWith('[fusim:webp]'), true)

  // configureServer 之后 public 里出现的 .webp 属于用户资源，插件不接管
  await writePng(path.join(dir, 'img/a.webp'))
  await request('/img/a.webp')
  assert.equal(nextCalls.length, 1)

  // change 不重扫：新文件在 change 事件后仍不可见
  await writePng(path.join(dir, 'img/c.png'))
  server.notify('change', path.join(dir, 'img/c.png'))
  await request('/img/c.webp')
  assert.equal(nextCalls.length, 2)
  // add 且路径在 publicDir 下才重扫：新源图立即可按需服务（回包非空即实际服务过）
  server.notify('add', path.join(dir, 'img/c.png'))
  const added = await request('/img/c.webp')
  assert.notEqual(added.body, null)
  // add 但路径不在 publicDir 下：不重扫，仍放行
  const outside = makePublicDir(['outside.png'])
  server.notify('add', path.join(outside, 'outside.png'))
  await request('/outside.webp')
  assert.deepEqual(nextCalls, ['/next', '/next', '/next'])
})

test('dev：源图增删后重扫同步 dev 改写集并整页刷新', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const plugin = makePlugin(dir, 'serve')
  const server = makeFakeServer()
  ;(plugin.configureServer as any)(server)
  await (plugin.buildStart as any).call({})
  assert.equal((plugin.transform as any).call({}, 'src="/img/a.png"', '/x.tsx'), 'src="/img/a.webp"')

  // watcher 走到的重扫路径：新增源图后改写集必须带上它，并通知整页刷新
  await writePng(path.join(dir, 'img/new.png'))
  server.notify('add', path.join(dir, 'img/new.png'))
  assert.equal((plugin.transform as any).call({}, 'src="/img/new.png"', '/x.tsx'), 'src="/img/new.webp"')
  assert.deepEqual(server.wsSent, [{ type: 'full-reload' }])

  // 删除后同样重扫：改写集收回，再次整页刷新
  fs.unlinkSync(path.join(dir, 'img/new.png'))
  server.notify('unlink', path.join(dir, 'img/new.png'))
  assert.equal((plugin.transform as any).call({}, 'src="/img/new.png"', '/x.tsx'), null)
  assert.equal(server.wsSent.length, 2)
})

function makePlugin(publicDir: string, command: 'build' | 'serve', options: { ssr?: boolean; cacheDir?: string } = {}) {
  const plugin = webpImages({ cacheDir: options.cacheDir })
  ;(plugin.configResolved as any)({
    root: publicDir,
    publicDir,
    command,
    build: { outDir: path.join(publicDir, 'dist'), ssr: options.ssr ?? false },
  })
  return plugin
}

test('build 时 transform 改写已转换的引用', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const plugin = makePlugin(dir, 'build')
  await (plugin.buildStart as any).call({})
  assert.equal((plugin.transform as any).call({}, 'src="/img/a.png"', '/x.tsx'), 'src="/img/a.webp"')
  assert.equal((plugin.transform as any).call({}, 'const a = 1', '/x.tsx'), null)
})

test('插件前置（enforce: pre）到 vite:css 之前，CSS 源码里的 url() 也被改写', async () => {
  // vite:css 会先把 url(/img/a.png) 换成 __VITE_PUBLIC_ASSET__ 占位符；不前置就赶不上了
  assert.equal(webpImages().enforce, 'pre')
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const plugin = makePlugin(dir, 'build')
  await (plugin.buildStart as any).call({})
  assert.equal((plugin.transform as any).call({}, 'a { background: url(/img/a.png) }', '/src/x.css'), 'a { background: url(/img/a.webp) }')
})

test('转码失败的图片不参与 build 改写（原图保留）', async () => {
  const dir = makePublicDir(['img/broken.png'])  // 空文件
  const plugin = makePlugin(dir, 'build')
  const warnings: unknown[][] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => void warnings.push(args)
  try { await (plugin.buildStart as any).call({}) } finally { console.warn = origWarn }
  assert.equal((plugin.transform as any).call({}, 'src="/img/broken.png"', '/x.tsx'), null)
  assert.equal(warnings.length, 1)
})

test('SSR 独立进程只改写缓存里已有的条目，client 趟失败的保持原引用', async () => {
  const dir = makePublicDir(['broken.png'])  // 空文件
  await writePng(path.join(dir, 'a.png'))
  // build:ssg 的两趟是不同进程、插件状态互不相通，共享的只有 cacheDir，故显式传入
  const cacheDir = path.join(dir, 'cache')
  const warnings: unknown[][] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => void warnings.push(args)
  // 第一趟 · client：a.png 转码成功写入缓存，broken.png 失败
  const client = makePlugin(dir, 'build', { cacheDir })
  try { await (client.buildStart as any).call({}) } finally { console.warn = origWarn }
  assert.equal(warnings.length, 1)
  // 第二趟 · SSR：新进程 failed 为空，只认缓存目录里存在的事实
  const ssr = makePlugin(dir, 'build', { cacheDir, ssr: true })
  await (ssr.buildStart as any).call({})
  assert.equal((ssr.transform as any).call({}, 'src="/a.png"', '/x.tsx'), 'src="/a.webp"')
  assert.equal((ssr.transform as any).call({}, 'src="/broken.png"', '/x.tsx'), null)
})

test('同一实例连续两轮构建，状态重置后报告张数不累加', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const plugin = makePlugin(dir, 'build')
  const logs: unknown[][] = []
  const origLog = console.log
  console.log = (...args: unknown[]) => void logs.push(args)
  try {
    await (plugin.buildStart as any).call({})
    ;(plugin.closeBundle as any).call({})
    await (plugin.buildStart as any).call({})
    ;(plugin.closeBundle as any).call({})
  } finally { console.log = origLog }
  const reportLines = logs.map((args) => String(args[0]))
  const counts = reportLines.filter((line) => line.includes('张'))
  assert.equal(counts.length, 2)
  assert.equal(counts.every((line) => line.includes('1 张')), true)
  assert.equal(reportLines.some((line) => line.includes('2 张')), false)
})

test('closeBundle 单张拷贝失败只警告并继续，报告照常打印且不删原图', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  await writePng(path.join(dir, 'img/b.png'))
  const plugin = makePlugin(dir, 'build')
  await (plugin.buildStart as any).call({})
  // 模拟 copyPublicDir 先把原图拷进 outDir
  fs.mkdirSync(path.join(dir, 'dist/img'), { recursive: true })
  fs.copyFileSync(path.join(dir, 'img/a.png'), path.join(dir, 'dist/img/a.png'))
  fs.copyFileSync(path.join(dir, 'img/b.png'), path.join(dir, 'dist/img/b.png'))

  // 第一张拷贝失败，第二张照常拷贝
  const realCopy = fs.copyFileSync.bind(fs)
  let copies = 0
  const copy = mock.method(fs, 'copyFileSync', (src: fs.PathLike, dest: fs.PathLike) => {
    copies++
    if (copies === 1) throw new Error('copy boom')
    realCopy(src, dest)
  })
  const warnings: unknown[][] = []
  const logs: unknown[][] = []
  const origWarn = console.warn
  const origLog = console.log
  console.warn = (...args: unknown[]) => void warnings.push(args)
  console.log = (...args: unknown[]) => void logs.push(args)
  try {
    ;(plugin.closeBundle as any).call({})
  } finally {
    copy.mock.restore()
    console.warn = origWarn
    console.log = origLog
  }
  assert.equal(warnings.length, 1)
  assert.equal(String(warnings[0][0]).includes('拷贝失败'), true)
  assert.equal(String(warnings[0][0]).includes('img/a.png'), true)
  // 拷贝失败的原图不删；后续条目的 .webp 照常落盘且原图照删
  assert.equal(fs.existsSync(path.join(dir, 'dist/img/a.png')), true)
  assert.equal(fs.existsSync(path.join(dir, 'dist/img/a.webp')), false)
  assert.equal(fs.existsSync(path.join(dir, 'dist/img/b.webp')), true)
  assert.equal(fs.existsSync(path.join(dir, 'dist/img/b.png')), false)
  // 报告不被吞掉
  const reportLines = logs.map((args) => String(args[0]))
  assert.equal(reportLines.some((line) => line.includes('2 张')), true)
})
