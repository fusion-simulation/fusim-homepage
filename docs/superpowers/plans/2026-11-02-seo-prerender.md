# SEO 预渲染 + meta 层实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run build` 为每个路由产出一份完整静态 HTML（含 title / description / canonical / OG / Twitter / JSON-LD），并生成 `sitemap.xml`、`robots.txt`、`404.html`；客户端改为 `hydrateRoot` 接管预渲染 DOM。

**Architecture:** 主编译产出的 `dist/index.html` 当壳（已含 hash 资源引用与内联首屏样式）；`scripts/prerender.mjs` 用 webpack Node API 另编一个 `target: 'node'` 的 server bundle（复用同一套 MDX / WebP / Babel loader），逐路由 `renderToString` + styled-components `ServerStyleSheet` 渲染，再由纯函数 `composeShell` 改写壳并落盘为 `dist/<route>/index.html`。

**Tech Stack:** webpack 5、React 19（`react-dom/server` / `hydrateRoot`）、styled-components 6（`ServerStyleSheet`）、wouter 3（自定义 location hook）、Node 24（原生 TS 类型擦除 + `node --test`）。

**Spec:** `docs/superpowers/specs/2026-11-02-seo-prerender-design.md`

## Global Constraints

- 构建管线不动根基：仍是 webpack 5 + `babel-loader` + `webpack-plugins/mdx.ts` + `virtual:publications`；**dev（`npm run dev`）完全不跑预渲染**，Fast Refresh 体验不变。
- 产物里没有 `.css` 文件：页面样式只能经 `ServerStyleSheet.getStyleTags()` 内联进 `<head>`。
- canonical 域名 `https://www.fusim.cn`，唯一来源是 `src/content/site.ts` 的 `site.url`；站内路径一律 `/` 开头、`/` 结尾（`normalizePath`）。
- 不新增任何 `dependencies` / `devDependencies`（`sharp` 已在 devDependencies）。
- 门禁：`npx tsc -b`、`npm test`（= `node --test webpack-plugins/*.test.ts`）、`npm run lint`（Biome：单引号、无分号、行宽 100）。
- 壳 HTML 是 HtmlWebpackPlugin 生产模式**压缩后**的形态：属性不带引号（`<div id=root>`、`<meta name=description content=…>`）。改写必须同时兼容压缩形态与带引号形态，锚点匹配不到要**抛错**，不能静默产出没有 meta 的页面。
- canonical / `og:url` / sitemap 里的路径一律 `encodeURI`（附件目录名可能是中文）。
- 根 `index.html` 模板不改（内联首屏样式与主题脚本原样保留）。
- 每个 task 结束都要 `npx tsc -b && npm test && npm run lint` 全绿后再提交。

## Review Focus

1. **壳锚点失效**：HtmlWebpackPlugin 升级或模板改动后压缩形态变化（属性加引号、root div 多出属性），改写必须抛错而不是产出没有 meta 的页面 —— Task 4「缺锚点抛错」测试。
2. **OG 图与 logo 被 WebP 转码吃掉**：`public/` 里的 png 默认会被转成 `.webp` 且**原图不发进产物**，`og:image` 与 JSON-LD `logo` 会 404 —— Task 1 的 exclude 测试 + Task 5 的 `dist/og-image.png` 检查。
3. **404 页**：必须是 `dist/404.html`、带 `noindex`、不带 canonical / OG / JSON-LD、不进 sitemap —— Task 4 测试。
4. **转义**：title / description 里的 `&`、`<`、引号不能破坏 HTML；JSON-LD 里的 `<` 必须转成 `\u003c`，否则 `</script>` 会截断脚本 —— Task 3 / Task 4 测试。
5. **替换串里的 `$` 语义**：`body` 中出现 `$&` / `$'`（React 内联样式、MathJax 路径都可能带 `$`）时不能被 `String.replace` 当成替换模板 —— Task 4 测试。
6. **非 ASCII 路径**：`/assets/pub/2026/1/数据/` 这类附件目录页在 canonical 与 sitemap 里必须是百分号编码 —— Task 3 测试。

## 对 spec 的两处补充（已核对现有代码，spec 未覆盖）

1. `public/og-image.png`、`public/logos/fusim-logo-512.png` 必须**跳过 WebP 转码**。现有 `WebpPlugin`（`webpack-plugins/webp.ts`）会把 public 里的 png/jpg/gif 转成 `.webp` 并在 `assets()` 里只发 `.webp`，原 png 不进产物 —— 社交爬虫和 JSON-LD 会拿到 404。做法：`WebpTool` 增加 `exclude`（按源 URL 精确匹配），的主编译与 server bundle 传同一份列表。
2. 404 页**不注入** canonical / OG / JSON-LD，只注入 `noindex` 与样式：哨兵路径 `/__404__/` 不是真实 URL，写进 canonical 只是噪声。

---

### Task 1: WebP 排除项（OG 图与 logo 保持 PNG）

**Files:**
- Modify: `webpack-plugins/webp.ts`
- Test: `webpack-plugins/webp.test.ts`
- Modify: `webpack.config.mjs`

**Interfaces:**
- Consumes: 无
- Produces:
  - `collectImageEntries(publicDir: string, exclude?: readonly string[]): { entries: ImageEntry[]; skipped: SkippedImage[] }` —— `exclude` 是源 URL（如 `'/og-image.png'`）精确匹配，命中项既不转码也不进 `skipped`。
  - `WebpToolOptions.exclude?: readonly string[]`；`WebpTool` 上暴露 `readonly exclude`。
  - `webpack.config.mjs` 导出 `PASSTHROUGH_IMAGE_URLS: readonly string[]`。

- [ ] **Step 1: 写失败测试**

在 `webpack-plugins/webp.test.ts` 末尾追加（`makePublicDir`、`os`、`fs`、`path` 已有）：

```ts
test('exclude 里的源图保持原样：不转码、不记跳过', () => {
  const dir = makePublicDir(['og-image.png', 'logos/fusim-logo-512.png', 'assets/img/a.png'])
  const { entries, skipped } = collectImageEntries(dir, ['/og-image.png', '/logos/fusim-logo-512.png'])
  assert.deepEqual(entries.map((entry) => entry.sourceRel), ['assets/img/a.png'])
  assert.deepEqual(skipped, [])
})

test('WebpTool 的 exclude 项按原图发进产物，不产生 .webp', async () => {
  const dir = makePublicDir(['og-image.png', 'assets/img/a.png'])
  fs.writeFileSync(path.join(dir, 'og-image.png'), 'PNG')
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-cache-'))
  dirs.push(cacheDir)

  const tool = new WebpTool({ serve: true, exclude: ['/og-image.png'] })
  tool.bind({ publicDir: dir, cacheDir })
  await tool.prepare()

  assert.deepEqual(tool.entries.map((entry) => entry.sourceRel), ['assets/img/a.png'])
  const assets = tool.assets()
  assert.deepEqual(assets.map((asset) => asset.name).sort(), ['assets/img/a.png', 'og-image.png'])
  assert.equal(assets.find((asset) => asset.name === 'og-image.png')?.data.toString(), 'PNG')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL —— `collectImageEntries` 忽略第二个参数，`og-image.png` 出现在 entries 里。

- [ ] **Step 3: 实现 exclude**

`webpack-plugins/webp.ts` 三处改动：

```ts
export function collectImageEntries(
  publicDir: string,
  exclude: readonly string[] = [],
): { entries: ImageEntry[]; skipped: SkippedImage[] } {
  const files = fs.existsSync(publicDir) ? scanFiles(publicDir) : []
  const excluded = new Set(exclude)
  // ...在 for (const file of files) 循环体最前面：
  //   if (excluded.has(`/${file.rel}`)) continue
```

`WebpToolOptions` 增加 `exclude?: readonly string[]`；`WebpTool` 增加 `readonly exclude: readonly string[]`，构造函数里 `this.exclude = options.exclude ?? []`；`rescan()` 改为 `collectImageEntries(this.env.publicDir, this.exclude)`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS（全部既有 webp 测试仍然通过）。

- [ ] **Step 5: 配置里登记需要保留的 PNG**

`webpack.config.mjs`：在 `export default async` 之前加

```js
/** OG 分享图与 JSON-LD logo 必须是 PNG（社交爬虫与结构化数据），跳过 WebP 转码、原样发进产物。 */
export const PASSTHROUGH_IMAGE_URLS = ['/og-image.png', '/logos/fusim-logo-512.png']
```

并把 `new WebpPlugin({ serve: isDev })` 改成 `new WebpPlugin({ serve: isDev, exclude: PASSTHROUGH_IMAGE_URLS })`。

- [ ] **Step 6: 门禁**

Run: `npx tsc -b && npm test && npm run lint`
Expected: 全绿。

- [ ] **Step 7: 提交**

```bash
git add webpack-plugins/webp.ts webpack-plugins/webp.test.ts webpack.config.mjs
git commit -m "feat(webp): 支持排除项，OG 图与 JSON-LD logo 保留 PNG"
```

---

### Task 2: 品牌分享资产（OG 图 + 512 logo）

**Files:**
- Create: `scripts/generate-social-assets.mjs`
- Create: `public/og-image.png`（1200×630）
- Create: `public/logos/fusim-logo-512.png`（512×512）

**Interfaces:**
- Consumes: `public/logos/fusim-logo-full.svg`（2919×508）、`public/logos/fusim-logo-stacked.svg`（607×596）、`sharp`
- Produces: 两个 PNG 文件。**只生成一次并入库**，构建流程不调用本脚本。

- [ ] **Step 1: 写一次性生成脚本**

`scripts/generate-social-assets.mjs`：

```js
/**
 * 一次性生成社交分享图与 JSON-LD logo（产物已入库，构建不依赖本脚本）。
 * 品牌 SVG / 令牌色变化时手动重跑：node scripts/generate-social-assets.mjs
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BRAND = { bg: '#0b0714', glowA: '#8b5cf6', glowB: '#e05cff', ink: '#f3edff' }

/** 现有 SVG 是纯黑填充，深色品牌底上必须换成浅墨色（源 SVG 不动）。 */
async function logoPng(svgRel, width) {
  const svg = (await readFile(path.join(root, svgRel), 'utf8')).replaceAll(
    'fill="#000000"',
    `fill="${BRAND.ink}"`,
  )
  return sharp(Buffer.from(svg)).resize({ width }).png().toBuffer()
}

/**
 * 品牌底（W×H），返回 SVG Buffer：`BRAND.bg` 实底 + 两个 radialGradient 辉光叠加 ——
 * a: cx 78% cy −8% r 62%，glowA 从 0.5 渐隐；b: cx 8% cy −4% r 58%，glowB 从 0.32 渐隐。
 * 色值与 index.html 里 body 背景的 --glow-a / --glow-b 同源。
 */
function backdrop(width, height) {}

await sharp(backdrop(1200, 630))
  .composite([{ input: await logoPng('public/logos/fusim-logo-full.svg', 780), gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public/og-image.png'))

await sharp(backdrop(512, 512))
  .composite([
    { input: await logoPng('public/logos/fusim-logo-stacked.svg', 400), gravity: 'center' },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public/logos/fusim-logo-512.png'))

console.log('  ✓ public/og-image.png (1200×630)')
console.log('  ✓ public/logos/fusim-logo-512.png (512×512)')
```

- [ ] **Step 2: 生成并核对尺寸**

Run: `node scripts/generate-social-assets.mjs && node -e "const s=require('sharp');Promise.all([s('public/og-image.png').metadata(),s('public/logos/fusim-logo-512.png').metadata()]).then(([a,b])=>console.log(a.width+'x'+a.height, b.width+'x'+b.height))"`
Expected: `1200x630 512x512`，两文件非空（og 图预期 20–120 KB）。

- [ ] **Step 3: 肉眼核对**

Run: 在文件管理器 / 浏览器打开 `public/og-image.png`
Expected: 深紫底、浅色 FUSIM logo 居中、无裁切、无黑底黑字。

- [ ] **Step 4: 门禁**

Run: `npm run lint`
Expected: 通过（本 task 不涉 tsc；`npm test` 在 Task 3 补尺寸断言后覆盖）。

- [ ] **Step 5: 提交**

```bash
git add scripts/generate-social-assets.mjs public/og-image.png public/logos/fusim-logo-512.png
git commit -m "feat(seo): 生成 OG 分享图与 JSON-LD logo"
```

---

### Task 3: meta 层纯函数（JSON-LD / sitemap / robots）

**Files:**
- Create: `webpack-plugins/prerender.ts`
- Create: `webpack-plugins/prerender.test.ts`

**Interfaces:**
- Consumes: 无（纯函数，不 import `src/`，避免 node 测试里碰到虚拟模块）
- Produces:
  - `type SiteInfo = { url: string; name: string; alternateName: string; email: string; logo: string; ogImage: string }`（`url` 不带尾斜杠，`logo` / `ogImage` 是绝对 URL）
  - `type PageSeo = { url: string; title: string; description: string; ogType: 'website' | 'article'; date?: string; notFound?: boolean }`
  - `escapeHtml(value: string): string` —— `& < > " '` 五个字符；同一函数也用于 sitemap（输出对 XML 同样合法）
  - `absoluteUrl(site: SiteInfo, path: string): string` —— `site.url + encodeURI(path)`
  - `buildJsonLd(page: PageSeo, site: SiteInfo): string` —— 返回完整 `<script type="application/ld+json">…</script>`
  - `buildSitemap(pages: readonly PageSeo[], site: SiteInfo): string`
  - `buildRobots(site: SiteInfo): string`

- [ ] **Step 1: 写失败测试**

`webpack-plugins/prerender.test.ts`：

```ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL —— `Cannot find module './prerender.ts'`（或 `buildJsonLd is not a function`）。

- [ ] **Step 3: 实现 `webpack-plugins/prerender.ts`**

```ts
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
```

`escapeHtml` 用一张固定表按 `&` 优先替换。`absoluteUrl` 为 `site.url + encodeURI(path)`。

`buildJsonLd` 的节点构造（`@graph` 数组，顶层 `{"@context":"https://schema.org","@graph":[…]}`）：

- 恒有 `Organization`：`name: site.name`、`alternateName: site.alternateName`、`url: site.url`、`logo: site.logo`、`email: site.email`。
- `page.url === '/'` 追加 `WebSite`：`name`、`url: site.url`、`inLanguage: 'zh-CN'`。
- `page.ogType === 'article'` 追加 `Article`：`headline: page.title`、`description: page.description`、`author: { '@type': 'Organization', name: site.name }`、`mainEntityOfPage: absoluteUrl(site, page.url)`；`page.date` 存在时加 `datePublished`。
- 返回 `<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<', '\\u003c')}</script>`。

`buildSitemap`：按 `url` 码点升序（`a.url < b.url ? -1 : 1`，相等返回 0），每条输出两行或三行的 `<url>` 块（缩进 2 空格），`loc` 用 `escapeHtml(absoluteUrl(site, page.url))`，有 `date` 才写 `<lastmod>`；整体以 XML 声明开头、`</urlset>` 结尾并带收尾换行。

`buildRobots`：三行 `User-agent` / `Allow` / `Disallow` 加 `Sitemap: ${site.url}/sitemap.xml`，末尾换行（即上一步测试里的 `join('\n')` 结果）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS（新增 8 个用例全部通过）。

- [ ] **Step 5: 门禁**

Run: `npx tsc -b && npm run lint`
Expected: 全绿。

- [ ] **Step 6: 提交**

```bash
git add webpack-plugins/prerender.ts webpack-plugins/prerender.test.ts
git commit -m "feat(seo): JSON-LD / sitemap / robots 纯函数"
```

---

### Task 4: 壳改写 `composeShell` 与 `htmlFileFor`

**Files:**
- Modify: `webpack-plugins/prerender.ts`
- Modify: `webpack-plugins/prerender.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `PageSeo` / `SiteInfo` / `escapeHtml` / `absoluteUrl` / `buildJsonLd`
- Produces:
  - `type ShellPage = PageSeo & { body: string; styles: string }`
  - `composeShell(shell: string, page: ShellPage, site: SiteInfo): string`
  - `htmlFileFor(url: string): string` —— `'/'` → `'index.html'`，`'/a/b/'` → `'a/b/index.html'`

- [ ] **Step 1: 写失败测试**

追加到 `webpack-plugins/prerender.test.ts`，并把 Task 3 的 import 扩为 `composeShell, htmlFileFor, type ShellPage`：

```ts
/** 真实壳形态：HtmlWebpackPlugin 生产模式压缩后属性不带引号。 */
const MINIFIED_SHELL =
  '<!doctype html><html lang=zh-CN><head><meta charset=utf-8><meta name=description content=旧描述><title>聚核智算 FUSIM</title></head><body><div id=root></div></body></html>'

const PAGE: ShellPage = {
  url: '/about/',
  title: '企业介绍 | 聚核智算 FUSIM',
  description: '企业介绍。',
  ogType: 'website',
  body: '<main>正文</main>',
  styles: '<style data-styled="true">.a{color:red}</style>',
}

test('composeShell 改写压缩壳的 title / description / root', () => {
  const html = composeShell(MINIFIED_SHELL, PAGE, SITE)
  assert.match(html, /<title>企业介绍 \| 聚核智算 FUSIM<\/title>/)
  assert.doesNotMatch(html, /旧描述/)
  assert.match(html, /<div id="root"><main>正文<\/main><\/div>/)
})

test('composeShell 兼容带引号的壳', () => {
  const pretty =
    '<head><meta name="description" content="旧"><title>旧</title></head><body><div id="root"></div></body>'
  const html = composeShell(pretty, PAGE, SITE)
  assert.match(html, /<title>企业介绍 \| 聚核智算 FUSIM<\/title>/)
  assert.match(html, /content="企业介绍。"/)
  assert.match(html, /<div id="root"><main>正文<\/main><\/div>/)
})

test('composeShell 注入 canonical / OG / twitter / JSON-LD / 样式到 </head> 前', () => {
  const html = composeShell(MINIFIED_SHELL, PAGE, SITE)
  for (const snippet of [
    '<link rel="canonical" href="https://www.fusim.cn/about/">',
    '<meta property="og:site_name" content="聚核智算">',
    '<meta property="og:type" content="website">',
    '<meta property="og:url" content="https://www.fusim.cn/about/">',
    '<meta property="og:image" content="https://www.fusim.cn/og-image.png">',
    '<meta property="og:locale" content="zh_CN">',
    '<meta name="twitter:card" content="summary_large_image">',
    '.a{color:red}',
  ]) {
    assert.ok(html.includes(snippet), `缺少 ${snippet}`)
  }
  assert.ok(html.indexOf('rel="canonical"') < html.indexOf('</head>'))
})

test('composeShell 对 404 只注入 noindex 与样式', () => {
  const html = composeShell(MINIFIED_SHELL, { ...PAGE, url: '/__404__/', notFound: true }, SITE)
  assert.match(html, /<meta name="robots" content="noindex">/)
  assert.doesNotMatch(html, /rel="canonical"/)
  assert.doesNotMatch(html, /og:/)
  assert.doesNotMatch(html, /application\/ld\+json/)
  assert.match(html, /\.a\{color:red\}/)
})

test("composeShell 原样保留 body 里的 $& 与 $'", () => {
  const body = '<span>$& $` $\' $1</span>'
  const html = composeShell(MINIFIED_SHELL, { ...PAGE, body }, SITE)
  assert.ok(html.includes(`<div id="root">${body}</div>`), '替换串里的 $ 不能被当成替换模板')
})

test('composeShell 转义 title 与 description', () => {
  const html = composeShell(
    MINIFIED_SHELL,
    { ...PAGE, title: 'a&b<c>d"e', description: `x"y` },
    SITE,
  )
  assert.match(html, /<title>a&amp;b&lt;c&gt;d&quot;e<\/title>/)
  assert.match(html, /content="x&quot;y"/)
})

test('composeShell 锚点缺失时抛错（不静默产出没有 meta 的页面）', () => {
  assert.throws(() => composeShell('<head></head>', PAGE, SITE), /找不到.*title/)
  assert.throws(
    () => composeShell('<head><title>t</title></head>', PAGE, SITE),
    /找不到.*description/,
  )
  assert.throws(
    () => composeShell('<head><title>t</title><meta name=description content=d></head>', PAGE, SITE),
    /找不到.*root/,
  )
})

test('htmlFileFor 把路由映射到 index.html 路径', () => {
  assert.equal(htmlFileFor('/'), 'index.html')
  assert.equal(htmlFileFor('/about/'), 'about/index.html')
  assert.equal(htmlFileFor('/assets/pub/2026/1/data/'), 'assets/pub/2026/1/data/index.html')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL —— `composeShell is not a function` / `htmlFileFor is not a function`。

- [ ] **Step 3: 实现**

```ts
/** 壳里的三个锚点：压缩后属性不带引号，两种形态都要匹配。 */
const TITLE = /<title>[\s\S]*?<\/title>/
const DESCRIPTION = /<meta[^>]*\bname=["']?description["']?[^>]*>/i
const ROOT = /<div id=["']?root["']?><\/div>/

/** 只替换第一处；锚点缺失直接抛错（HtmlWebpackPlugin 改形态时必须人工介入，不能静默跳过）。 */
function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  if (!pattern.test(html)) throw new Error(`[fusim:prerender] 壳 HTML 里找不到${what}`)
  // 用函数替换：body 里的 $& / $' 不能被当成替换模板
  return html.replace(pattern, () => replacement)
}
```

`composeShell` 依次做：替换 `<title>`（`escapeHtml(page.title)`）、替换 description 标签为 `<meta name="description" content="${escapeHtml(page.description)}">`、把 root 换成 `<div id="root">${page.body}</div>`、在 `</head>` 前插入标签块（`html.includes('</head>')` 不成立时抛错）。标签块顺序：

- 非 404：`<link rel="canonical" href="{absoluteUrl}">`、`og:site_name`、`og:type`（`page.ogType`）、`og:url`（同 canonical）、`og:title`、`og:description`、`og:image`（`site.ogImage`）、`og:locale`（`zh_CN`）、`twitter:card`（`summary_large_image`）、`buildJsonLd(page, site)`、`page.styles`。
- 404：`<meta name="robots" content="noindex">`、`page.styles`。

所有属性值都过 `escapeHtml`。`htmlFileFor`：去掉前导 `/`，为空返回 `'index.html'`，否则 `${去尾斜杠后的路径}/index.html`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS（Task 3 用例不受影响）。

- [ ] **Step 5: 门禁**

Run: `npx tsc -b && npm run lint`
Expected: 全绿。

- [ ] **Step 6: 提交**

```bash
git add webpack-plugins/prerender.ts webpack-plugins/prerender.test.ts
git commit -m "feat(seo): 壳改写、canonical/OG 注入与产物路径映射"
```

---

### Task 5: 预渲染编排（server bundle + 逐路由落盘）

**Files:**
- Modify: `src/content/site.ts`
- Modify: `src/lib/meta.ts`
- Modify: `webpack.config.mjs`
- Create: `src/ssr.tsx`
- Create: `scripts/prerender.mjs`
- Modify: `package.json`
- Delete: `scripts/spa-fallback.mjs`

**Interfaces:**
- Consumes: Task 1 的 `PASSTHROUGH_IMAGE_URLS`、Task 4 的 `composeShell` / `htmlFileFor`、Task 3 的 `buildSitemap` / `buildRobots`
- Produces:
  - `src/content/site.ts`：`site.url = 'https://www.fusim.cn'`
  - `src/lib/meta.ts`：`export const staticRoutePaths: readonly string[]`（`Object.keys(staticMeta)`）
  - `webpack.config.mjs`：`export function createModuleRules({ isDev }: { isDev: boolean })` 返回三条 loader 规则组成的数组
  - `src/ssr.tsx`：`NOT_FOUND_PATH`、`siteInfo`、`RenderedPage`、`routes: string[]`、`render(pathname: string): RenderedPage`
  - `scripts/prerender.mjs`：无导出，构建末尾执行

- [ ] **Step 1: 站点数据与路由清单**

`src/content/site.ts` 在 `as const` 对象里、`name` 之前加：

```ts
  /** 生产域名（canonical / OG / sitemap / robots 的唯一来源）。 */
  url: 'https://www.fusim.cn',
```

`src/lib/meta.ts` 在 `staticMeta` 之后加：

```ts
/** 静态页的站点路径（与 staticMeta 的键同源），预渲染路由全集的一部分。 */
export const staticRoutePaths: readonly string[] = Object.keys(staticMeta)
```

- [ ] **Step 2: 抽出共用 loader 链**

`webpack.config.mjs`：把 `module.rules[0].oneOf` 里的三条规则原样搬进新的具名导出（`plugin()` helper 与内容都不变），默认导出处改为 `module: { rules: [{ oneOf: createModuleRules({ isDev }) }] }`：

```js
/** 主编译与预渲染 server bundle 共用的 loader 链：新增 loader 时必须两边同时生效，否则渲染结果分叉。 */
export function createModuleRules({ isDev }) {
  return [
    /* …原样搬入的三条规则（virtual-publications / .mdx / .[cm]?[jt]sx?）… */
  ]
}
```

- [ ] **Step 3: 写 `src/ssr.tsx`**

```tsx
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'
import { Router } from 'wouter'
import { App } from './App.tsx'
import { site } from './content/site.ts'
import { contentPageByUrl } from './lib/content.ts'
import { normalizePath, resolveMeta, staticRoutePaths } from './lib/meta.ts'
import { attachmentDirByUrl } from './lib/publications.ts'

/** 未知路径的哨兵：只用于渲染 404 页的完整 App 树，客户端永远不会请求它。 */
export const NOT_FOUND_PATH = '/__404__/'

/** 与 webpack-plugins/prerender.ts 的 SiteInfo 结构一致（刻意不互相 import，避免 server bundle 混进纯函数模块）。 */
export const siteInfo = {
  url: site.url,
  name: site.name,
  alternateName: 'FUSIM',
  email: site.email,
  logo: `${site.url}/logos/fusim-logo-512.png`,
  ogImage: `${site.url}/og-image.png`,
}

export type RenderedPage = {
  url: string
  title: string
  description: string
  ogType: 'website' | 'article'
  date?: string
  notFound: boolean
  body: string
  styles: string
}

/** 全部要预渲染的路由：静态页 + MDX 内容页 + 论文附件目录页。 */
export const routes: string[] = [
  ...new Set([...staticRoutePaths, ...contentPageByUrl.keys(), ...attachmentDirByUrl.keys()]),
].sort()

function isKnownPath(url: string): boolean {
  return staticRoutePaths.includes(url) || contentPageByUrl.has(url) || attachmentDirByUrl.has(url)
}

/** 在 Node 里渲染单个路由：wouter 注入固定路径（navigate 是空实现），样式由 ServerStyleSheet 收集。 */
export function render(pathname: string): RenderedPage {
  const url = normalizePath(pathname)
  const page = contentPageByUrl.get(url)
  const isJournal = page?.kind === 'journal'
  const sheet = new ServerStyleSheet()

  try {
    const body = renderToString(
      <StyleSheetManager sheet={sheet.instance}>
        <Router hook={() => [url, () => {}]}>
          <App />
        </Router>
      </StyleSheetManager>,
    )

    return {
      url,
      ...resolveMeta(url),
      ogType: isJournal ? 'article' : 'website',
      date: isJournal ? page.frontmatter.date : undefined,
      notFound: !isKnownPath(url),
      body,
      styles: sheet.getStyleTags(),
    }
  } finally {
    sheet.seal()
  }
}
```

注意：`src/ssr.tsx` 只进 server bundle，`main.tsx` 绝不能 import 它（否则 `react-dom/server` 被拖进客户端产物）。

- [ ] **Step 4: 写 `scripts/prerender.mjs`**

```js
/**
 * 构建期预渲染：编 server bundle → 逐路由渲染 → 改写 dist/index.html 壳 → 生成
 * 404.html / sitemap.xml / robots.txt。dev（webpack serve）不跑这一步。
 */
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpack from 'webpack'
import { createModuleRules, PASSTHROUGH_IMAGE_URLS } from '../webpack.config.mjs'
import { buildRobots, buildSitemap, composeShell, htmlFileFor } from '../webpack-plugins/prerender.ts'
import { WebpPlugin } from '../webpack-plugins/webp.ts'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const distDir = path.join(root, 'dist')
const bundlePath = path.join(root, 'node_modules/.cache/fusim-prerender/server.cjs')

/** 只换 target / entry / output，loader 链与主编译同源（见 createModuleRules）。 */
const serverConfig = {
  mode: 'production',
  context: root,
  target: 'node',
  entry: './src/ssr.tsx',
  output: {
    path: path.dirname(bundlePath),
    filename: path.basename(bundlePath),
    publicPath: '/',
    library: { type: 'commonjs2' },
  },
  devtool: false,
  resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'] },
  module: { rules: [{ oneOf: createModuleRules({ isDev: false }) }] },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /^virtual:publications$/,
      path.join(root, 'webpack-plugins/virtual-publications.js'),
    ),
    // serve: true 只登记工具并算出改写集，不转码、不发资源（与 dev 同一套注册机制）
    new WebpPlugin({ serve: true, exclude: PASSTHROUGH_IMAGE_URLS }),
  ],
  optimization: { minimize: false },
  performance: { hints: false },
  stats: 'errors-warnings',
}

/** 跑一次编译：Promise 包住 webpack(serverConfig).run，回调里先 compiler.close()，再按 error / stats.hasErrors() reject 或 resolve。 */
function compileServer() {}

await compileServer()

const require = createRequire(import.meta.url)
const { NOT_FOUND_PATH, render, routes, siteInfo } = require(bundlePath)

let shell
try {
  shell = await readFile(path.join(distDir, 'index.html'), 'utf8')
} catch (error) {
  throw new Error('[fusim:prerender] 读不到 dist/index.html：先跑 webpack 再跑本脚本', {
    cause: error,
  })
}

// 壳只读一次：首页那一页会覆盖 dist/index.html，后面的页面仍用同一份带 hash 资源引用的壳
const pages = routes.map((url) => render(url))

for (const page of pages) {
  const file = path.join(distDir, htmlFileFor(page.url))
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, composeShell(shell, page, siteInfo))
}

const notFound = render(NOT_FOUND_PATH)
await writeFile(path.join(distDir, '404.html'), composeShell(shell, notFound, siteInfo))
await writeFile(path.join(distDir, 'sitemap.xml'), buildSitemap(pages, siteInfo))
await writeFile(path.join(distDir, 'robots.txt'), buildRobots(siteInfo))

console.log(`  ✓ 预渲染 ${pages.length} 页 · 404.html · sitemap.xml · robots.txt`)
```

- [ ] **Step 5: 改构建链、删 SPA 回退脚本**

`package.json`：

```json
"build": "tsc -b && webpack --mode production && node scripts/prerender.mjs"
```

然后 `git rm scripts/spa-fallback.mjs`（404.html 现在由预渲染产出）。

- [ ] **Step 6: 跑完整构建**

Run: `npm run build`
Expected: 末尾出现 `✓ 预渲染 15 页 · 404.html · sitemap.xml · robots.txt`，无 webpack 报错、无 hydration 相关警告。

- [ ] **Step 7: 核对产物**

```bash
find dist -name index.html | sort
```

Expected: 15 个 —— `dist/index.html`、`about/`、`journal/`、`press/`、`products/`、`publications/`、`responsibility/`、7 个 MDX 页、`assets/pub/2026/1/data/`。

```bash
grep -o 'rel="canonical" href="[^"]*"' dist/about/index.html
grep -o '"@type":"[A-Za-z]*"' dist/index.html
grep -c '<h1' dist/about/index.html
grep -o 'noindex' dist/404.html
cat dist/robots.txt
head -4 dist/sitemap.xml
test -f dist/og-image.png && test -f dist/logos/fusim-logo-512.png && ! test -f dist/og-image.webp && echo assets-ok
```

Expected：canonical 为 `https://www.fusim.cn/about/`；首页 JSON-LD 含 `Organization` 与 `WebSite`；`about` 页 `<h1` 计数 ≥ 1（正文已注入）；404 有 `noindex`；robots 五行 + Sitemap 行；sitemap 以 XML 声明开头；`assets-ok`。

- [ ] **Step 8: 预览确认状态码与回退**

Run: `npm run preview` 另开一个终端 `curl -sI http://localhost:4173/about/ | head -1` 与 `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/nope`
Expected: `HTTP/1.1 200 OK` 与 `404`。

- [ ] **Step 9: 门禁并提交**

Run: `npx tsc -b && npm test && npm run lint`

```bash
git add src/content/site.ts src/lib/meta.ts src/ssr.tsx webpack.config.mjs scripts/prerender.mjs package.json
git rm scripts/spa-fallback.mjs
git commit -m "feat(seo): 构建期预渲染全部路由并生成 sitemap / robots / 404"
```

---

### Task 6: 客户端 hydration 与 canonical 同步

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/lib/useDocumentMeta.ts`

**Interfaces:**
- Consumes: Task 5 产物里 `<div id="root">` 已有子节点；`site.url`
- Produces: 预渲染页走 `hydrateRoot`，dev / 空容器仍走 `createRoot`；客户端导航时 `<link rel="canonical">` 同步为目标页

- [ ] **Step 1: `main.tsx` 分流**

把末尾的 `createRoot(container).render(app)` 换成：

```tsx
// 预渲染产物已有 DOM：接管而不是重绘（dev 的壳是空容器，仍走 createRoot）
if (container.hasChildNodes()) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
```

`import { createRoot, hydrateRoot } from 'react-dom/client'`。

- [ ] **Step 2: `useDocumentMeta` 同步 canonical**

在 effect 末尾（description 写完之后）加：

```ts
    // SPA 跳转后 canonical 必须跟着走，否则整站都会指向首次进入的那一页
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = `${site.url}${url}`
```

并在文件头 `import { site } from '../content/site'`。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: 成功，产物同上一步。

- [ ] **Step 4: 浏览器验证（人工，spec 非目标里明确不做构建期校验）**

Run: `npm run preview`，浏览器打开 `/`、`/about/`、`/products/`、`/products/cbaldur/`、`/journal/`、`/publications/`、`/assets/pub/2026/1/data/`、`/nope`
Expected:

- 控制台**没有** hydration 报错（`Hydration failed because…` / `did not match`）；
- 首屏样式无闪烁（样式来自预渲染 `<head>`，不是运行时注入）；
- 点导航跳到 `/about/` 后，DevTools 里 `link[rel=canonical]` 变为 `https://www.fusim.cn/about/`；
- `/nope` 显示「页面不存在」，标题为 `404 | 聚核智算 FUSIM`，canonical 指向该未知路径（客户端行为，不影响 noindex 的 404.html）。

- [ ] **Step 5: dev 未受影响**

Run: `npm run dev`，打开 `http://localhost:5000/`
Expected: 空壳 + `createRoot` 正常渲染，Fast Refresh 正常工作，页面无 canonical 报错。

- [ ] **Step 6: 门禁并提交**

Run: `npx tsc -b && npm test && npm run lint`

```bash
git add src/main.tsx src/lib/useDocumentMeta.ts
git commit -m "feat(seo): 预渲染产物走 hydrateRoot，客户端同步 canonical"
```

---

### Task 7: README 与部署说明

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 5 / 6 的行为
- Produces: 文档与实现一致

- [ ] **Step 1: 改「常用命令」**

- `npm run build` 改为：`bash# 类型检查 + 构建 + 预渲染（每个路由一份静态 HTML，产物在 dist/）`；
- 删掉 `> 站点是单页应用（SPA）……` 那段，替换为一句：构建期预渲染每个路由（SSG 形态），客户端 `hydrateRoot` 接管；dev 仍是纯 SPA。

- [ ] **Step 2: 目录结构节**

- `scripts/spa-fallback.mjs` 一行删除；
- 新增 `scripts/prerender.mjs`（编 server bundle + 渲染 + 写 sitemap/robots/404）、`scripts/generate-social-assets.mjs`（一次性生成 OG 图与 logo，产物已入库）；
- 新增 `src/ssr.tsx`（server bundle 入口：`routes` / `render`）、`webpack-plugins/prerender.ts`（壳改写 / JSON-LD / sitemap / robots 纯函数）。

- [ ] **Step 3: 新增「SEO」小节（放在「部署」之前）**

内容：canonical 域名 `https://www.fusim.cn`（`site.url` 单源）、每页注入的 meta（canonical / OG / Twitter / JSON-LD）、`robots.txt` 挡掉附件里不入库的大文件、`sitemap.xml` 由构建生成、OG 图与 logo 跳过 WebP 转码（`PASSTHROUGH_IMAGE_URLS`）、百度站长验证文件放 `public/`。

- [ ] **Step 4: 改「部署」节**

- Apache（主）：`ErrorDocument 404 /404.html`（未知路径以 404 状态返回预渲染的 404 页），无尾斜杠路径由 mod_dir 301 到带斜杠；
- nginx：`try_files $uri $uri/ =404;` + `error_page 404 /404.html;`（不再回退到 `index.html`）；
- 对象存储 / CDN：404 文档指向 `404.html`；
- 保留附件大数据文件单独上传的说明。

- [ ] **Step 5: 门禁并提交**

Run: `npm run lint`

```bash
git add README.md
git commit -m "docs: 预渲染构建链与部署说明"
```

---

## 完成后

- `npx tsc -b && npm test && npm run lint && npm run build` 全绿。
- `git diff --stat` 应只覆盖上面列出的文件。
- 交接给人工：按 Task 6 Step 4 的清单在浏览器过一遍各路由（spec 明确不在构建里加 hydration 自动校验）。
