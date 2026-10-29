import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { collectImageEntries, rewriteReferences } from './webp.ts'

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
