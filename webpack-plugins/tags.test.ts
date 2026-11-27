import assert from 'node:assert/strict'
import test from 'node:test'
import { type Tagged, collectTags, filterByTag, parseTag } from '../src/lib/tags.ts'

/** 最小夹具：只带 tags，够纯函数用，不必造整个 ContentPage。 */
const tagged = (groups: string[][]): Tagged[] =>
  groups.map((tags) => ({ frontmatter: { tags } }))

test('collectTags：按篇数降序，同数保持首次出现顺序', () => {
  const pages = tagged([['科研进展'], ['会议交流', '科研进展'], ['会议交流']])
  assert.deepEqual(collectTags(pages), [
    { tag: '科研进展', count: 2 },
    { tag: '会议交流', count: 2 },
  ])
})

test('collectTags：无 tags 的页面不产生条目', () => {
  assert.deepEqual(collectTags(tagged([[], ['媒体报道']])), [{ tag: '媒体报道', count: 1 }])
})

test('filterByTag：null 与空串返回全量', () => {
  const pages = tagged([['科研进展'], []])
  assert.equal(filterByTag(pages, null).length, 2)
  assert.equal(filterByTag(pages, '').length, 2)
})

test('filterByTag：未知标签返回空列表', () => {
  assert.deepEqual(filterByTag(tagged([['科研进展']]), '不存在的标签'), [])
})

test('parseTag：读 query，缺失与空值都是 null', () => {
  assert.equal(parseTag('?tag=%E7%A7%91%E7%A0%94%E8%BF%9B%E5%B1%95'), '科研进展')
  assert.equal(parseTag(''), null)
  assert.equal(parseTag('?tag='), null)
  assert.equal(parseTag('?theme=dark'), null)
})
