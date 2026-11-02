# 内容页（MDX）阅读体验优化设计

> 2026-11-02

## 意图

MDX 内容页（产品详情、产品分类、普通 MDX 页面）当前在桌面端与移动端都不符合阅读的人体工学：
产品详情页没有页面标题；小节标题（`#####`，h5）退化为与正文同大小的浏览器默认样式；
`wide: true` 的页面正文最宽 2400px，桌面 1440px 视口下一行约 1300px、上百个字符，
难以换行定位；同一页图片宽度从 640px 到 1200px 不等，多图并排的 MGI 三联图在手机上无法辨认。

目标：让所有 MDX 内容页的标题层级、行长、字号、图片尺寸和移动端堆叠都有统一、可预期的节奏。

## 目标 / 非目标 / 反目标

**目标**

- 每个内容页顶部显示 `frontmatter.title`，并有统一的页头（眉题 + 标题 + 描述）。
- 正文阅读宽度约 760–860px，行长控制在 60–80 个字符；正文字号不小于 1.05rem，行高 1.8。
- h2–h5 全部纳入标题体系，层级清晰，h5 不再退化为默认样式。
- 图片规则统一：默认在正文宽度内居中；宽图（如 `width >= 1000`）允许突出到更宽的画布（不超过 1200px）。
- 多图并排（如 MGI 三联图）在桌面为网格，窄屏下堆叠为单列，单图不被缩到无法辨认。
- 移动端（375px 起）无横向溢出，段落与图片之间节奏一致。

**非目标**

- 不改动 MDX 内容本身（文字、图片文件、frontmatter 数据），除非需要为图片加语义 class。
- 不改首页、产品列表页（`ProductsPage`）、论文页、新闻页等非 MDX 页面。
- 不引入新依赖，不替换 styled-components。
- 不改构建管线（webpack / MDX loader / WebP 生成）。

**反目标**

- 不能为了统一行长而把宽图挤成看不清的小图。
- 不能让标题在窄屏下占据过多高度（h2 在手机上不超过约 1.6rem）。

## 约束

- 仓库使用 styled-components 与容器查询（`src/styles/responsive.ts` 的 `container` / `fromContainer`），新样式沿用这一约定，不新增视口媒体查询。
- 产物里没有独立 CSS 文件，样式继续经 `ServerStyleSheet` 内联进 HTML；SSR 与客户端渲染结果必须一致。
- 图片仍经 `ResponsiveImage` 输出 `srcSet` 与固有宽高，避免布局抖动。
- 类型门禁 `tsc -b`、Lint `biome check`、测试 `node --test webpack-plugins/*.test.ts` 需全部通过。

## 方案

采用方案 A：阅读宽度 + 统一排版体系。

| 方案 | 取舍 |
| --- | --- |
| **A. 阅读宽度 + 统一排版体系（采用）** | 一次性解决标题、行长、字号、图片、移动端问题；改动集中在 `prose.ts`、`MdxPage.tsx`、`ResponsiveImage.tsx`，风险可控 |
| B. 局部修补（补 h5、补标题、缩小图片） | 改动最少，但长行与字号问题保留，不符合目标 |

### 组件改动

1. **`src/pages/MdxPage.tsx`**：所有 MDX 内容页统一渲染页头（眉题取 `kind` 对应的分类名，标题取 `frontmatter.title`，描述取 `frontmatter.description`）。`journal` 已有页头，保持不变，避免重复。
2. **`src/styles/prose.ts`**：
   - `ProseArticle` 的 `max-width` 改为统一阅读宽度（860px）；`wide` 不再放宽正文列，而是只放宽图片（见下）。
   - 补充 h5 样式；字号、行高、段距按统一的 scale 设定。
   - 列表与引用块的字号、缩进与正文对齐。
3. **`src/components/ResponsiveImage.tsx`**：
   - 默认 `max-width` 跟随正文列；通过 `wide` 或 `displayWidth` 大于正文列时允许突出（上限 1200px）。
   - 新增可选的分组容器（如 `ImageGrid`），用于多图并排；桌面 2–3 列，窄容器单列堆叠。
4. **MDX 文件**：MGI 三联图改为使用分组容器包裹，不改图片本身。

### 验证

- 视觉：用 `npm run build` 后的 `dist/` 与 `scripts/preview.mjs` 对照 `service_tokamak`、`service_frc`、`cbaldur` 三类页面，在 1440px 与 390px 视口截图检查。
- 结构：确认标题、行长、图片宽度满足上方目标；确认无横向溢出（`scrollWidth === clientWidth`）。
- 门禁：`tsc -b`、`biome check`、`node --test` 通过。

## 已由设计者决定（请确认）

- 页头眉题文案沿用各分类的现有名称（产品 / 产品分类 / 页面）。
- 图片突出宽度上限定为 1200px，与当前最大展示宽度一致。
- 手机端 h2 字号上限为 1.6rem。

## 后续

- 设计获批后调用 `writing-plans` 生成实施计划，再逐步实现。
- 实施完成后提交到当前分支（不新建分支，除非你另有要求）。
