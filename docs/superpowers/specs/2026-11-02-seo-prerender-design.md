# SEO：构建期预渲染 + 基础 meta 层

> 2026-11-02

## 意图

站点是 React 19 SPA（wouter 客户端路由），首屏 HTML 只有一个空的 `<div id="root"></div>`：
百度 / 360 / 搜狗不执行 JS，抓到的正文是空的；Google 也要等二次渲染。同时缺少一整套
基础 meta 层：无 canonical、无 Open Graph / Twitter Card、无结构化数据，且
`robots.txt` 与 `sitemap.xml` 不存在（线上旧 Lume 站也没有）。

生产域名 `https://www.fusim.cn`（ICP 备案站，国内搜索引擎权重高）。本设计让每个路由
在构建期产出一份完整静态 HTML（即 SSG 形态的产物），并补齐 meta 层。

### 已否决的方案

| 方案 | 否决原因 |
| --- | --- |
| SSR（常驻 Node 按请求渲染） | 站点内容全部来自构建期数据（MDX + `virtual:publications`），没有按请求变化的数据；SSR 换来常驻进程的运维代价（监控 / 重启 / 反代）与更差 TTFB，SEO 结果与预渲染完全相同 |
| 迁移 SSG 框架（Astro / Next.js） | 需重写 4 个自研构建设施（MathJax v4 构建期 SVG、WebP 转码、论文附件扫描、MDX + frontmatter）并处理 styled-components 与框架的相容性；数周工作量，SEO 结果不变 |

## 约束

- 构建管线不动根基：仍是 webpack 5 + babel-loader + MDX loader + `virtual:publications`；
  dev 模式完全不引入预渲染（Fast Refresh 体验不变）。
- 仓库约定「产物里没有 CSS 文件」继续成立：styled-components 页面样式经
  `ServerStyleSheet` 内联进每页 HTML 的 `<head>`，仍无独立 `.css`。
- 静态托管：自有 Apache httpd 2.4（已实测满足全部契约）——未知路径以 **404 状态**
  返回（`ErrorDocument` 已生效），无尾斜杠路径自动 **301** 到尾斜杠（mod_dir 默认行为）。
  部署新版只需确认 `ErrorDocument 404 /404.html` 指向新产物；仓库内 README 部署节的
  nginx 示例同步改为 `error_page 404 /404.html;`（Apache 写法为主）。
- 类型门禁仍是 `tsc -b`；测试仍是 `node --test webpack-plugins/*.test.ts`。
- canonical 域名定为 `https://www.fusim.cn`；裸域 `fusim.cn` 目前与 www 同内容无跳转，
  301 属服务器配置，不在仓库内（见「非目标与后续」）。

## 方案

### 预渲染的接入点

| 方案 | 取舍 |
| --- | --- |
| **A. 构建后脚本（选中）** | `npm run build` 末尾用 webpack Node API 单独编一个 server bundle（`target: 'node'`），渲染全部路由、改写产物 HTML。与现有 `spa-fallback.mjs` 的「构建后处理」形态一致，逻辑独立可测；代价是 MDX / 虚拟模块编译两遍（数秒） |
| B. 同一 compilation 内做（child compiler / processAssets） | 少一次编译，但 child compiler 换 `target` 受限，且服务端渲染依赖「客户端产物已定型」的时序，插件内时序耦合重 |
| C. 无头浏览器抓取（react-snap 式） | 产物保真，但引入浏览器依赖、构建慢、CI 环境重 |

选 A 的原因：预渲染只需要「路由全集 + 渲染函数」，与客户端打包的唯一交集是
`dist/index.html` 这份壳（带 hash 资源引用），拿它做模板字符串改写即可；独立脚本
不需要碰 webpack 插件时序，失败也只在构建末尾报错，不影响主编译。

### 客户端接管方式

`main.tsx` 按 `container.hasChildNodes()` 分流：预渲染产物走 `hydrateRoot`（接管现有
DOM，不重绘）；dev 等空容器场景维持 `createRoot`。全站渲染期没有浏览器 API 依赖
（已核实：浏览器调用全部在 effect / 事件处理器 / `index.html` 内联脚本里），无需
为 SSR 添加组件级守卫。wouter 通过自定义 location hook 注入静态路径
（`<Router hook={() => [url, noop]}>`，wouter 的 SSR 惯例）。

### 样式内联

每路由用 styled-components 的 `ServerStyleSheet` + `StyleSheetManager` 渲染，
`getStyleTags()` 产物插入该页 `<head>`。主题仍由 `index.html` 内联脚本驱动
`html[data-theme]`，预渲染不影响首帧主题（内联全局样式本就在壳里）。

## 实现

### 新增 / 变更文件

```
src/ssr.tsx                       # server bundle 入口：导出 routes 与 render(url)
src/lib/meta.ts                   # 导出静态路由列表（staticMeta 现为模块私有）
src/content/site.ts               # 增加 url: 'https://www.fusim.cn'
src/main.tsx                      # hydrateRoot / createRoot 分流
src/lib/useDocumentMeta.ts        # 客户端导航时同步 <link rel="canonical">
webpack-plugins/prerender.ts      # 纯函数：壳改写 / sitemap / robots / JSON-LD
webpack-plugins/prerender.test.ts # 上述纯函数的单测
scripts/prerender.mjs             # 编排：编 server bundle → 逐路由写 HTML → 生成 sitemap/robots
scripts/spa-fallback.mjs          # 删除（404.html 由预渲染产出）
package.json                      # build 链改为 `tsc -b && webpack --mode production && node scripts/prerender.mjs`
public/og-image.png               # 1200×630 分享图（一次性生成后提交）
public/logos/fusim-logo-512.png   # 512×512 PNG logo（JSON-LD 用，由现有 SVG 转出）
```

### 路由全集

server bundle 内复用现有模块枚举，与客户端同源：

- `staticMeta` 的键（`/`、`/about/`、`/journal/`、`/press/`、`/products/`、
  `/publications/`、`/responsibility/`）；
- `contentPageByUrl` 的键（产品 / 分组 / journal 详情，当前 7 页）；
- `attachmentDirByUrl` 的键（论文附件目录页）；
- `404`：以一个哨兵路径渲染**完整 App 树**（`Layout` + `NotFoundPage`，与客户端对未知
  路径 hydration 时期望的树一致），写入 `dist/404.html`。

### scripts/prerender.mjs 编排

1. webpack Node API 编 server bundle（`target: 'node'`，CJS 输出到
   `node_modules/.cache/fusim-prerender/server.cjs`）：复用 mdx loader、webp-loader
   （保证 MDX 里的图片引用是线上 `.webp` 路径）、`virtual:publications` 替换插件与
   babel-loader（dev 关闭）；不装 HtmlWebpackPlugin / ReactRefresh。webp-loader 依赖
   已注册的 WebpPlugin 实例（fail-loud 是既有设计），这里注册一个「只计算改写集、
   不发资源」的 WebpPlugin（serve 模式的工具层，与 dev 同一套单例注册机制）——
   改写集由 `public/` 树决定，与主编译结果一致，`webp.ts` 的接口不动。
2. 读取 `dist/index.html` 作为壳（含 hash 资源引用与内联首屏样式）。
3. 逐路由 `render(url)`，经 `composeShell` 改写后写
   `dist/<route>/index.html`（`/` 即覆盖 `dist/index.html`；`/products/cbaldur/` →
   `dist/products/cbaldur/index.html`；附件目录页写到 `/assets/pub/<...>/index.html`，
   不与 PDF 等真实文件冲突）。
4. `404`：以哨兵路径渲染完整 App + `<meta name="robots" content="noindex">` → `dist/404.html`。
5. 生成 `dist/sitemap.xml`（全部路由，排除 404）与 `dist/robots.txt`。

### composeShell（纯函数，单测覆盖）

对壳 HTML 做四处字符串改写：

- `<title>` 换成路由 title；`<meta name="description">` 的 content 换成路由描述；
- `</head>` 前注入：canonical、OG / Twitter Card、JSON-LD、`ServerStyleSheet`
  的 style 标签、（仅 404）noindex；
- `<div id="root"></div>` 替换为 `<div id="root">…renderToString 产物…</div>`。

HtmlWebpackPlugin 在 production 会压缩壳 HTML，改写以精确模式匹配
（`<title>…</title>`、`name="description"`、`id="root"`），与压缩结果兼容。

### meta 层

- **canonical**：`<link rel="canonical" href="https://www.fusim.cn{url}">`，路径沿用
  `normalizePath` 的尾斜杠约定；客户端导航时由 `useDocumentMeta` 同步更新
  （SPA 跳转后 canonical 不再指向旧页）。
- **Open Graph / Twitter**：每页注入 `og:site_name`、`og:type`（journal 详情为
  `article`，其余 `website`）、`og:url`、`og:title`、`og:description`、
  `og:image`（绝对 URL 指向 `public/og-image.png`）、`og:locale=zh_CN`、
  `twitter:card=summary_large_image`。分享图与 logo 为一次性资产生成后入库
  （sharp 由品牌 SVG / 令牌色生成），构建流程不依赖生成步骤。
- **JSON-LD**：全站注入 `Organization`（name / alternateName=FUSIM / url / logo /
  email）；首页追加 `WebSite`（name / url / `inLanguage: zh-CN`）；journal 详情页
  追加 `Article`（headline / datePublished=frontmatter.date / description /
  author→Organization / mainEntityOfPage=canonical）。当前 journal 无条目，逻辑
  就位后新增 `.mdx` 自动生效。
- **robots.txt**（构建期生成，单源 `site.url`）：

  ```
  User-agent: *
  Allow: /
  Disallow: /*.dat
  Disallow: /*_dump
  Disallow: /*_energy
  Sitemap: https://www.fusim.cn/sitemap.xml
  ```

  后三条挡掉论文附件里不入库的大数据文件（README 约定的 dump / energy 等），
  附件目录页 HTML 不受影响。
- **sitemap.xml**：全部预渲染路由的 `<url><loc>`；journal 详情附
  `lastmod`（frontmatter.date），其余不写 lastmod。

### 已验证可行的前提

- 渲染期无浏览器 API 依赖（全库 grep 核实）；
- `resolveMeta` 已覆盖全部路由类型的 title / description，预渲染与客户端同源；
- `TokamakScene` 等为纯 SVG + CSS 动画，`renderToString` 直接产出。

## 已知差异

- **构建变慢数秒**：MDX / 虚拟模块在 server bundle 里再编译一遍；server bundle 不做
  缓存（构建本来就在 CI / 本地显式触发）。
- **OG 标签不随客户端路由更新**：只有爬虫读 OG，它们拿到的已是逐页预渲染 HTML；
  客户端只同步 title / description / canonical。
- **404.html 承载所有未知路径**：直接访问未知 URL 先看到预渲染的 404 页内容，
  hydration 后行为不变（wouter 的 Switch 对未知路径同样渲染 `NotFoundPage`，
  两端一致）；title / description 由客户端 hook 修正为对应值。
- **同一公式在单页重复时 SVG id 重复**：MathJax 构建期渲染的既有行为，预渲染不改变它。

## 非目标与后续

- **字体自托管**：`fonts.googleapis.com` 在大陆可达性差，影响 LCP 与可用性，值得做
  但属独立工作项（woff2 子集化 + `public/fonts/` 自托管），本次不动。
- **百度站长平台验证与主动推送**：需要账号操作；部署后在 `public/` 放验证文件即可。
- **裸域 → www 的 301**：服务器配置（nginx / CDN），配合 canonical 消除双域名分权。
- **Product / SoftwareApplication 等更细结构化数据**：需要先有真实数据源（价格、版本），
  现在没有。
- **预渲染的 hydration 告警监控**：实现完成后以浏览器过一遍各路由，确认控制台无
  hydration mismatch；不在构建里加自动校验。
