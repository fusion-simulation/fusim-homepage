import assert from 'node:assert/strict'
import test from 'node:test'
import { currentPageAttr, isActivePath } from '../src/lib/nav.ts'

test('同路径与子路径都算激活', () => {
  assert.equal(isActivePath('/products/', '/products/'), true)
  assert.equal(isActivePath('/products/cbaldur/', '/products/'), true)
  assert.equal(isActivePath('/products', '/products/'), true)
  assert.equal(isActivePath('/journal/wechat-x/', '/journal/'), true)
})

test('按路径边界匹配，前缀相同的兄弟路径不算激活', () => {
  assert.equal(isActivePath('/products-extra/', '/products/'), false)
  assert.equal(isActivePath('/journalism/', '/journal/'), false)
  assert.equal(isActivePath('/', '/products/'), false)
})

test('首页只在根路径激活，query/hash 不影响判断', () => {
  assert.equal(isActivePath('/', '/'), true)
  assert.equal(isActivePath('/?theme=dark', '/'), true)
  assert.equal(isActivePath('/products/?theme=dark#top', '/products/'), true)
  assert.equal(isActivePath('/about/', '/'), false)
})

test('aria-current：本级用 page，祖先路径用 true', () => {
  assert.equal(currentPageAttr('/journal/', '/journal/'), 'page')
  assert.equal(currentPageAttr('/journal?x=1', '/journal/'), 'page')
  assert.equal(currentPageAttr('/journal/wechat-x/', '/journal/'), 'true')
  assert.equal(currentPageAttr('/products/cbaldur/', '/products/'), 'true')
  assert.equal(currentPageAttr('/products-extra/', '/products/'), undefined)
  assert.equal(currentPageAttr('/', '/products/'), undefined)
})
