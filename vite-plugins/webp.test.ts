import assert from 'node:assert/strict'
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

async function writePng(abs: string) {
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#abcdef' } }).png().toFile(abs)
}

function makePlugin(publicDir: string, command: 'build' | 'serve') {
  const plugin = webpImages()
  ;(plugin.configResolved as any)({ root: publicDir, publicDir, command, build: { outDir: path.join(publicDir, 'dist'), ssr: false } })
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
