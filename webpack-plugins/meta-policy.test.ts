import assert from 'node:assert/strict'
import test from 'node:test'
import { metaTagPlan } from '../src/lib/meta-policy.ts'

const siteUrl = 'https://www.fusim.cn'

test('indexable 页面写 canonical，不写 robots', () => {
  assert.deepEqual(
    metaTagPlan({ title: '关于', description: 'd', url: '/about/', siteUrl, indexable: true }),
    {
      title: '关于',
      description: 'd',
      canonical: 'https://www.fusim.cn/about/',
      robots: null,
    },
  )
})

test('404 删除 canonical 并写 noindex', () => {
  assert.deepEqual(
    metaTagPlan({
      title: '404 | 聚核智算 FUSIM',
      description: 'd',
      url: '/no-such-page/',
      siteUrl,
      indexable: false,
    }),
    {
      title: '404 | 聚核智算 FUSIM',
      description: 'd',
      canonical: null,
      robots: 'noindex',
    },
  )
})

test('canonical 不由路径拼接决定拼接方式：站点源带与不带尾斜杠都得到同一个地址', () => {
  const base = { title: 't', description: 'd', url: '/press/x/', indexable: true }
  assert.equal(metaTagPlan({ ...base, siteUrl }).canonical, 'https://www.fusim.cn/press/x/')
  assert.equal(
    metaTagPlan({ ...base, siteUrl: 'https://www.fusim.cn/' }).canonical,
    'https://www.fusim.cn/press/x/',
  )
})
