# 用 styled-components 替换 Griffel

日期：2026-10-31
规模：小改动（无用户可见的行为变化）

## 意图

现在全站样式由 Griffel 的 `makeStyles` 原子化类名承担，样式通过 `useXxxStyles()`
返回的类名对象 + `mergeClasses` / `cx` 拼接落到 DOM 上。这套写法有两个成本：
类名是运行时拼出来的，类型信息只到「有哪些 key」，组合靠人记；项目里还留着一份
`global.css`，以及为 Griffel 构建期抽取服务的 vite 插件和 `cssMinify: false` 绕行。

目标是用 styled-components（组件化 CSS-in-JS）替掉它，并让仓库里不再出现 `.css`
文件。同时项目只保留 SPA 形态，不再需要 SSR / 预渲染，因此不必实现服务端样式收集
（`ServerStyleSheet`）。

## 目标

- 依赖里没有 `@griffel/react`、`@griffel/vite-plugin`；不再有 `makeStyles`、
  `mergeClasses`、`cx`。
- 样式以 styled 组件（`styled.div` 等）的形式存在，变体用 transient props
  （`$variant`、`$delay`、`$open`）。
- 仓库源码中没有任何 `.css` 文件：全局样式（变量、暗色覆盖、重置、`body` 背景）内联进
  `index.html` 的 `<head>`。**不**用 `createGlobalStyle` 承担首屏样式——它要等 JS 执行后
  才注入，冷启动会先闪一帧白底/浅色，属于视觉回归。
- 产物里也不再需要样式表：数学公式从 KaTeX（`katex.min.css` + 字体）换成 MathJax v4
  的 SVG 输出，SVG 自带字形路径，不需要任何外部 CSS 或字体。
- 视觉与交互保持不变（含暗色主题、移动端断点、入场动画）。
- 只保留 SPA：删除 `build:ssg` 预渲染链路。

## 非目标

- 不改文案、布局、路由、MDX 内容本身。
- 不引入 `ThemeProvider` 主题对象：暗色主题由 `index.html` 的内联脚本在 React 启动前
  设置 `html[data-theme]`，继续用 CSS 变量（`var(--accent)` 等）表达颜色，切换主题
  不经过 React。
- 不做 SSR / 预渲染，也不为它保留代码路径。

## 约束

- React 19 + wouter + Vite 8；styled-components 6.x 支持 React 19。
- 数学公式在**构建期**渲染成 SVG（不引入运行时 MathJax JS）：
  - `rehype-mathjax` 最新版仍锁 `mathjax-full@3`，不能满足「v4」，因此自己写一个小
    rehype 插件直接调 `@mathjax/src@4`。
  - 已在 `/tmp` 做过验证：`@mathjax/src/bundle/tex-svg.js` + liteDOM 在 Node 里可用，
    输出自包含（`<defs>` 内嵌字形、无 `@font-face` / `url()`），每个公式 id 前缀独立；
    MDX 编译 → `react-dom/server` 渲染无警告，`xlink:href`、`viewBox` 正常落地。
    初始加载约 1s，之后每个公式几十毫秒。
  - 只加载 `input/tex` + `output/svg` + `adaptors/liteDOM`（经 `startup.js`），
    不加载 `a11y/sre`：SRE 在 Node 里会起一个 worker thread，`vite build` 与
    `node --test` 结束后进程退不掉（官方方案 `MathJax.done()` 会整体关闭，不能在中途调用），
    而且它的 `data-semantic-*` 让每个公式大 3 倍（复杂行间从 8KB 涨到 23KB）。
  - 代价：没有语音文本。用 TeX 源码写入 SVG 的 `aria-label` 兜底（`role="img"` 至少有名字）。
- `src/styles/` 目录结构保留，文件名仍是 `shared.ts` / `layout.ts` / `hero.ts` /
  `prose.ts` / `publications.ts`，新增 `global.ts`。

## 方案（已选定 A）

A. **组件化重写**：样式模块导出 styled 组件，页面用组件替代 `className`。
   - 优点：拿到 styled-components 的写法，变体有类型，没有类名拼接。
   - 代价：4 个组件 + 11 个页面的 JSX 都要改，但属于机械替换。

被否掉的：

B. 单容器 + 后代选择器：类名裸字符串、没有类型保护，跨组件复用退化成手写 CSS。
C. 保留样式对象 + 自制注入器：等于重写一遍 Griffel。

## 决定

- **样式层形态**：`src/styles/*.ts` 导出 `styled` 组件（如 `Section`、`CardGrid`、
  `Card`、`Btn`、`ProseBox`、`MockFrame`），页面里写 `<Section>` / `<Card as="article">`。
  同一元素在不同页面需要不同标签时用 `as`；需要不同链接语义时单独导出
  `CardLink = styled(Link)` / `ExternalCard = styled.a`（产品卡片）。
- **变体**：用 transient props，不生成 `-primary` 这类修饰类。按钮：`$variant`
  （`primary` / `secondary` / `accent` / `light`）。
- **入场动画**：`fadeUp` 用 `keyframes` 生成，`reveal(delay)` 用 `css` 片段导出；
  需要动画的组件接 `$delay`（0–3，对应 0 / 0.15 / 0.3 / 0.45s）。不再有独立的
  `reveal` / `delay1..3` 样式键。
- **全局样式**：变量、暗色覆盖、`*` 重置、`body`、`a` 全部写在 `index.html` 的 `<head>`
  （首屏即生效，且不是 `.css` 文件）。`fadeUp` keyframes 与 `reveal` 片段放在
  `src/styles/animation.ts`，供 `shared` / `hero` 共用。`vite-plugins/prepaint.test.ts`
  守住这条不变量。
  主题切换图标的显隐不再用全局类名，改成 `styled(SunIcon)` / `styled(MoonIcon)` 上写
  `html[data-theme="dark"] & { … }`。
- **prose**：仍用后代选择器（`& h1`、`& p` …），styled-components 的嵌套与此一致；
  MDX 输出的裸标签不需要逐个包装。
- **内联 `style`**：`MdxPage`（日志正文的 `marginTop`）与 `NotFoundPage` 里的内联样式
  改由 styled 组件承担，迁移后源码中不再有行内样式。
- **SSG 清理**：删 `src/entry-server.tsx`、`scripts/prerender.mjs`、`package.json` 的
  `build:ssg`、`meta.ts` 的 `getStaticPaths` / `StaticPath`（`resolveMeta` 保留，供
  `useDocumentMeta` 用）。README 里预渲染相关段落一并删除。
- **Vite**：`plugins: [mdx(), react(), publications(), webpImages()]`；移除
  `cssMinify: false` 及其 Griffel 说明，恢复 Vite 默认压缩。
- **不引入 `babel-plugin-styled-components`**：不加额外 devDependency 和 Babel 插件，
  dev 下的类名保持 styled-components 的默认哈希。
- **数学公式（v4 SVG，构建期）**：新增 `vite-plugins/mathjax.ts`，在 `mdx()` 的
  `rehypePlugins` 里替换现在的 `rehype-katex`：
  - 识别 remark-math 产出的 `language-math` / `math-inline` / `math-display` 节点；
    行间公式若包在 `<pre><code>` 里，替换整个 `<pre>`（沿用 `rehype-mathjax` 的处理）。
  - 首次命中公式时懒加载 `@mathjax/src/bundle/startup.js`（liteDOM adaptor，
    `output.font = 'mathjax-newcm'`、`fontCache: 'local'`、`startup.typeset = false`）。
  - `MathJax.tex2svgPromise()` → 取 `<svg>` → `serializeXML` → `hast-util-from-html`
    还原成 hast，外面包一层 `span.math.math-inline` 或 `div.math.math-display`
    （行间加 `text-align: center`），不产出 `mjx-container` 这种需要 MathJax CSS 的节点。
  - 同一 `display + tex` 用 Map 缓存，避免 dev 重复排版。
  - 依赖变化：移除 `katex`、`rehype-katex`、`main.tsx` 里的
    `katex/dist/katex.min.css`；新增 devDependencies `@mathjax/src`、
    `hast-util-from-html`、`hast-util-to-text`、`unist-util-visit-parents`。

## 留给实现者的

- 具体组件命名与拆分粒度（例如 `Btn` 还是 `Button`、卡片样式是否需要 `css` 片段导出）。
- `DataTree` 的 `variant` 如何映射到 `$variant`、附件页的固定配色如何组织。
- 迁移顺序（建议：依赖与全局样式 → styles 模块 → 组件 → 页面 → 删 Griffel 与 SSG →
  README），以及每步之后 `npm run build` / `npm run lint` 的验证。
