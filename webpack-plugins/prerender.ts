/**
 * 预渲染用到的纯函数：meta 片段、sitemap、robots、壳改写。
 * 不 import `src/`——这些函数要能在 node --test 里直接跑，不碰 webpack 虚拟模块。
 */

export type SiteInfo = {
  /** 站点根地址，不带尾斜杠 */
  url: string
  name: string
  alternateName: string
  email: string
  /** 绝对 URL */
  logo: string
  /** 绝对 URL */
  ogImage: string
}

export type PageSeo = {
  /** 站内路径，`/` 开头、`/` 结尾 */
  url: string
  title: string
  description: string
  ogType: 'website' | 'article'
  /** journal 详情的 frontmatter.date（YYYY-MM-DD） */
  date?: string
  /** 404 页：只注入 noindex，不进 sitemap、不写 canonical / OG / JSON-LD */
  notFound?: boolean
}

/** HTML / XML 共用的转义表，`&` 必须最先替换。 */
const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
} satisfies Record<string, string>

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char as keyof typeof ESCAPES])
}

export function absoluteUrl(site: SiteInfo, path: string): string {
  return site.url + encodeURI(path)
}

export function buildJsonLd(page: PageSeo, site: SiteInfo): string {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      name: site.name,
      alternateName: site.alternateName,
      url: site.url,
      logo: site.logo,
      email: site.email,
    },
  ]

  if (page.url === '/') {
    graph.push({
      '@type': 'WebSite',
      name: site.name,
      url: site.url,
      inLanguage: 'zh-CN',
    })
  }

  if (page.ogType === 'article') {
    graph.push({
      '@type': 'Article',
      headline: page.title,
      description: page.description,
      author: { '@type': 'Organization', name: site.name },
      mainEntityOfPage: absoluteUrl(site, page.url),
      ...(page.date ? { datePublished: page.date } : {}),
    })
  }

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })

  // `</script>` 里的 `<` 会把脚本标签提前闭合，转义成 JSON 的 \u003c
  return `<script type="application/ld+json">${json.replaceAll('<', '\\u003c')}</script>`
}

export function buildSitemap(pages: readonly PageSeo[], site: SiteInfo): string {
  const sorted = [...pages].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0))
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const page of sorted) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeHtml(absoluteUrl(site, page.url))}</loc>`)
    if (page.date) lines.push(`    <lastmod>${escapeHtml(page.date)}</lastmod>`)
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

export function buildRobots(site: SiteInfo): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /*.dat',
    'Disallow: /*_dump',
    'Disallow: /*_energy',
    `Sitemap: ${site.url}/sitemap.xml`,
    '',
  ].join('\n')
}
