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
      image: site.ogImage,
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

export type ShellPage = PageSeo & { body: string; styles: string }

/** 壳里的三个锚点：HtmlWebpackPlugin 压缩后属性不带引号，两种形态都要匹配。 */
const TITLE = /<title>[\s\S]*?<\/title>/
const DESCRIPTION = /<meta[^>]*\bname=["']?description["']?[^>]*>/i
const ROOT = /<div id=["']?root["']?><\/div>/

/** 只替换第一处；锚点缺失直接抛错（HtmlWebpackPlugin 改形态时必须人工介入，不能静默跳过）。 */
function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  if (!pattern.test(html)) throw new Error(`[fusim:prerender] 壳 HTML 里找不到${what}`)
  // 用函数替换：body 里的 $& / $' 不能被当成替换模板
  return html.replace(pattern, () => replacement)
}

export function composeShell(shell: string, page: ShellPage, site: SiteInfo): string {
  let html = replaceOnce(shell, TITLE, `<title>${escapeHtml(page.title)}</title>`, '<title>')
  // 整块换掉而不是只改 value：压缩壳的 content 可能不带引号
  html = replaceOnce(
    html,
    DESCRIPTION,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    'description meta',
  )
  html = replaceOnce(html, ROOT, `<div id="root">${page.body}</div>`, 'root 容器')

  const canonical = escapeHtml(absoluteUrl(site, page.url))
  // 404 页只求不被收录：不写 canonical / OG / JSON-LD
  const tags = page.notFound
    ? ['<meta name="robots" content="noindex">', page.styles]
    : [
        `<link rel="canonical" href="${canonical}">`,
        `<meta property="og:site_name" content="${escapeHtml(site.name)}">`,
        `<meta property="og:type" content="${escapeHtml(page.ogType)}">`,
        `<meta property="og:url" content="${canonical}">`,
        `<meta property="og:title" content="${escapeHtml(page.title)}">`,
        `<meta property="og:description" content="${escapeHtml(page.description)}">`,
        `<meta property="og:image" content="${escapeHtml(site.ogImage)}">`,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        `<meta property="og:image:alt" content="${escapeHtml(site.name)} ${escapeHtml(site.alternateName)}">`,
        '<meta property="og:locale" content="zh_CN">',
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:image" content="${escapeHtml(site.ogImage)}">`,
        buildJsonLd(page, site),
        page.styles,
      ]

  return replaceOnce(html, /<\/head>/, `${tags.join('')}</head>`, '</head>')
}

export function htmlFileFor(url: string): string {
  const route = url.replace(/^\/+/, '').replace(/\/+$/, '')
  return route ? `${route}/index.html` : 'index.html'
}

/* ---------- 响应式图片门禁：srcSet 候选提取与属性契约 ---------- */

/** 一个 `<img>` 标签解析后的结果：属性名统一小写（React 输出的 `srcSet` 也能吃到）。 */
export type HtmlImage = {
  attrs: Record<string, string>
  /** `srcSet` 拆出的候选：URL + 描述符。 */
  candidates: Array<{ url: string; descriptor: string }>
}

const IMG_TAG = /<img\b([^>]*)>/gi
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g

/** 解析 `srcSet`：data URL 整体算一个候选（内部逗号不拆），其余按逗号分隔。 */
function parseSrcSet(value: string): Array<{ url: string; descriptor: string }> {
  if (/^\s*data:/i.test(value)) return [{ url: value.trim(), descriptor: '' }]

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, ...rest] = part.split(/\s+/)
      return { url, descriptor: rest.join(' ') }
    })
}

/** 解析页面里所有 `<img>`：单/双引号与无引号属性都吃，属性名统一小写。 */
export function extractImages(html: string): HtmlImage[] {
  const images: HtmlImage[] = []

  for (const tag of html.matchAll(IMG_TAG)) {
    const attrs: Record<string, string> = {}
    for (const attribute of tag[1].matchAll(ATTRIBUTE)) {
      attrs[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3] ?? attribute[4] ?? ''
    }
    images.push({ attrs, candidates: parseSrcSet(attrs.srcset ?? '') })
  }

  return images
}

/** 站内路径：以单个 `/` 开头（`//cdn…` 是协议相对外链）。 */
function isSitePath(url: string): boolean {
  return /^\/(?!\/)/.test(url)
}

/** 去掉 query/hash 并解码：产物里是真实文件名（可能含空格等字符）。 */
function assetPathOf(url: string): string {
  const pathname = url.split(/[?#]/, 1)[0]
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

/**
 * 页面里所有站内图片候选（`src` + `srcSet` 的每个 URL），按文档顺序去重、已解码。
 * 外链、协议相对与 data URL 不归产物管，直接跳过。
 */
export function extractImageCandidates(html: string): string[] {
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const image of extractImages(html)) {
    const urls = [image.attrs.src ?? '', ...image.candidates.map((candidate) => candidate.url)]
    for (const url of urls) {
      if (!isSitePath(url)) continue
      const assetPath = assetPathOf(url)
      if (seen.has(assetPath)) continue
      seen.add(assetPath)
      candidates.push(assetPath)
    }
  }

  return candidates
}

/**
 * 响应式图片门禁：属性契约 + 站内候选必须真实存在。
 *
 * 契约（与 `ResponsiveImage` 的输出一致）：
 * - 每张图都有描述内容的 `alt`、数值型 `width` / `height`（固定宽高比，避免 CLS）；
 * - 带 `w` 描述符的 `srcSet` 必须有 `sizes`；
 * - `sizes` 以 `auto` 开头时必须 `loading="lazy"`（`sizes=auto` 依赖懒加载按真实槽位选图）。
 *
 * 返回问题列表：空数组表示通过。调用方决定抛错时机（本项目的预渲染在写盘前抛）。
 */
export function checkPageImages(html: string, exists: (assetPath: string) => boolean): string[] {
  const issues: string[] = []

  for (const image of extractImages(html)) {
    const { attrs, candidates } = image
    const label = attrs.src ? `图片 ${attrs.src}` : '图片'

    if (!attrs.alt) issues.push(`${label}：缺少描述内容的 alt`)
    if (!/^\d+$/.test(attrs.width ?? '')) issues.push(`${label}：width 必须是数值`)
    if (!/^\d+$/.test(attrs.height ?? '')) issues.push(`${label}：height 必须是数值`)

    const hasWidthDescriptor = candidates.some((candidate) => /\b\d+w$/.test(candidate.descriptor))
    if (candidates.length > 0 && hasWidthDescriptor && !attrs.sizes) {
      issues.push(`${label}：w 描述符的 srcSet 必须带 sizes`)
    }
    if (
      attrs.sizes &&
      /^auto\b/i.test(attrs.sizes.trim()) &&
      attrs.loading?.toLowerCase() !== 'lazy'
    ) {
      issues.push(`${label}：sizes 以 auto 开头时必须 loading="lazy"`)
    }
  }

  for (const candidate of extractImageCandidates(html)) {
    if (!exists(candidate)) issues.push(`图片候选不存在：${candidate}`)
  }

  return issues
}
