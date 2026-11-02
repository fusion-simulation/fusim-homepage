import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldHideHeader, TOP_THRESHOLD } from '../src/lib/header-visibility.ts'

const TALL = { scrollHeight: 3000, innerHeight: 900 }

test('停在最上端且页面可滚动时收起页头', () => {
  assert.equal(shouldHideHeader({ ...TALL, scrollY: 0 }), true)
  assert.equal(shouldHideHeader({ ...TALL, scrollY: TOP_THRESHOLD }), true, '阈值内仍算最上端')
})

test('离开最上端后页头滑出', () => {
  assert.equal(shouldHideHeader({ ...TALL, scrollY: TOP_THRESHOLD + 1 }), false)
  assert.equal(shouldHideHeader({ ...TALL, scrollY: 1200 }), false)
})

test('不能滚动的页面（如 404）始终露出页头', () => {
  // 高度刚好一屏：没有滚动空间，收起了就再也没有滚动事件把它叫回来
  assert.equal(shouldHideHeader({ scrollY: 0, scrollHeight: 900, innerHeight: 900 }), false)
  assert.equal(shouldHideHeader({ scrollY: 0, scrollHeight: 880, innerHeight: 900 }), false)
  // 只多出 1px 的亚像素余量不算可滚动
  assert.equal(shouldHideHeader({ scrollY: 0, scrollHeight: 901, innerHeight: 900 }), false)
  assert.equal(shouldHideHeader({ scrollY: 0, scrollHeight: 902, innerHeight: 900 }), true)
})
