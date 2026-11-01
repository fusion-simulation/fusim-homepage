import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  absoluteUrl,
  buildJsonLd,
  buildRobots,
  buildSitemap,
  escapeHtml,
  type PageSeo,
  type SiteInfo,
} from './prerender.ts'

const root = process.cwd()

const SITE: SiteInfo = {
  url: 'https://www.fusim.cn',
  name: '聚核智算',
  alternateName: 'FUSIM',
  email: 'info@fusim.cn',
  logo: 'https://www.fusim.cn/logos/fusim-logo-512.png',
  ogImage: 'https://www.fusim.cn/og-image.png',
}

const HOME: PageSeo = {
  url: '/',
  title: '聚核智算 FUSIM',
  description: '聚变等离子体软件 SaaS',
  ogType: 'website',
}

/** 取出 JSON-LD 的正文并解析：正文里若混入 `</script>`，正则会被提前截断、JSON.parse 直接抛错。 */
function parseJsonLd(html: string): { '@graph': Array<Record<string, unknown>> } {
  const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1]
  assert.ok(body, '应输出 JSON-LD 脚本')
  return JSON.parse(body)
}

test('escapeHtml 转义五个字符', () => {
  assert.equal(escapeHtml(`a&b<c>d"e'f`), 'a&amp;b&lt;c&gt;d&quot;e&#39;f')
})

test('absoluteUrl 拼绝对地址并对非 ASCII 路径编码', () => {
  assert.equal(absoluteUrl(SITE, '/about/'), 'https://www.fusim.cn/about/')
  assert.equal(absoluteUrl(SITE, '/x/数据/'), 'https://www.fusim.cn/x/%E6%95%B0%E6%8D%AE/')
})

test('首页 JSON-LD 含 Organization 与 WebSite', () => {
  const graph = parseJsonLd(buildJsonLd(HOME, SITE))['@graph']
  assert.deepEqual(
    graph.map((node) => node['@type']),
    ['Organization', 'WebSite'],
  )
  assert.equal(graph[0].name, '聚核智算')
  assert.equal(graph[0].alternateName, 'FUSIM')
  assert.equal(graph[0].logo, SITE.logo)
  assert.equal(graph[1].inLanguage, 'zh-CN')
})

test('journal 详情 JSON-LD 追加 Article（带 datePublished 与 canonical）', () => {
  const graph = parseJsonLd(
    buildJsonLd(
      {
        url: '/journal/hello/',
        title: '第一篇日志',
        description: '摘要',
        ogType: 'article',
        date: '2026-10-01',
      },
      SITE,
    ),
  )['@graph']
  const article = graph.find((node) => node['@type'] === 'Article')
  assert.ok(article, '应有 Article 节点')
  assert.equal(article.headline, '第一篇日志')
  assert.equal(article.datePublished, '2026-10-01')
  assert.equal(article.mainEntityOfPage, 'https://www.fusim.cn/journal/hello/')
  assert.equal((article.author as Record<string, unknown>)['@type'], 'Organization')
})

test('JSON-LD 把 < 转成 \\u003c，</script> 不会截断脚本', () => {
  const html = buildJsonLd({ ...HOME, description: 'x</script><b>y' }, SITE)
  assert.doesNotMatch(html, /<\/script><b>/)
  assert.equal(parseJsonLd(html)['@graph'][0]['@type'], 'Organization')
})

test('sitemap 按 URL 排序、journal 附 lastmod、带 XML 声明', () => {
  const xml = buildSitemap(
    [
      { url: '/products/', title: 't', description: 'd', ogType: 'website' },
      HOME,
      { url: '/journal/a/', title: 't', description: 'd', ogType: 'article', date: '2026-10-01' },
    ],
    SITE,
  )
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/)
  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/)
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1])
  assert.deepEqual(locs, [
    'https://www.fusim.cn/',
    'https://www.fusim.cn/journal/a/',
    'https://www.fusim.cn/products/',
  ])
  assert.equal([...xml.matchAll(/<lastmod>/g)].length, 1, '只有带日期的条目写 lastmod')
  assert.match(xml, /<lastmod>2026-10-01<\/lastmod>/)
})

test('robots.txt 规则与 sitemap 地址固定', () => {
  assert.equal(
    buildRobots(SITE),
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /*.dat',
      'Disallow: /*_dump',
      'Disallow: /*_energy',
      'Sitemap: https://www.fusim.cn/sitemap.xml',
      '',
    ].join('\n'),
  )
})

test('品牌资产是规定尺寸的 PNG', () => {
  for (const [file, size] of [
    ['public/og-image.png', { width: 1200, height: 630 }],
    ['public/logos/fusim-logo-512.png', { width: 512, height: 512 }],
  ] as const) {
    const buffer = readFileSync(path.join(root, file))
    assert.equal(buffer.subarray(1, 4).toString(), 'PNG', `${file} 应是 PNG`)
    assert.deepEqual(
      { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) },
      size,
      `${file} 尺寸不对`,
    )
  }
})
