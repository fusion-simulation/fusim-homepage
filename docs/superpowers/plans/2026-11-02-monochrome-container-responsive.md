# Monochrome Container-Responsive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将全站精进为黑白科研风，用集中语义的 CSS container queries 驱动组件响应式，并为正文动画图建立多宽度 WebP、`srcSet/sizes` 和预渲染校验闭环。

**Architecture:** 保留 React/styled-components/MDX/SSR 体系与现有内容结构。视觉令牌继续内联在 HTML 首屏；布局采用命名容器查询与 intrinsic grid/flex；图片由纯 helper 生成稳定标记，现有 Sharp/WebP 工具负责同组变体，开发、构建和预渲染共用同一候选宽度。

**Tech Stack:** React 19、TypeScript、styled-components 6、MDX、webpack 5、Sharp、Node test runner、Biome。

**Spec:** `/home/eziosweet/.qoder/plans/humble-glade-buck.md`

## Global Constraints

- 保留工程网格、mono 眉题、切角、HUD 细节、双主题和 `prefers-reduced-motion`；配色只允许中性黑/白/灰。
- 不使用 `ResizeObserver`、`matchMedia` 或运行时测宽；`src` 中不得残留视口宽度 `@media`。
- 容器阈值集中定义；不能写 `@container … var(--…)`。
- 保留真实视口需求：`100vh/100svh`、全屏背景以及 reduced-motion 用户偏好查询。
- 图片不放大、不改变动画帧、不新增 GIF fallback；OG/JSON-LD PNG 与 SVG 资产保持原策略。
- `sizes="auto, 100vw"` 只用于 `loading="lazy"` 图片；SSR 与客户端必须生成相同 URL 和属性。
- 不新增 UI/浏览器测试依赖，不修改路由和正文信息架构；未经用户明确要求不创建 git commit。

## Review Focus

- 嵌套容器可能命中错误祖先，或元素试图查询自身：Task 2 固定命名容器/helper 测试，并在窄化指定容器时做浏览器验证。
- 极窄容器、长文件名和正文媒体可能溢出：Task 2 固定 `min(100%, …)` 与正文溢出规则，Task 6 覆盖 320px 和 200% 缩放。
- 小源图与多帧 GIF 可能被放大、丢帧或因并发耗尽内存：Task 4 固定元数据、帧数、宽高比与任务并发测试。
- `sizes=auto` 缺少 lazy、srcSet 候选缺失或 SSR 输出不一致：Task 3 固定纯标记测试，Task 5 固定预渲染属性与候选产物校验。
- 变体目标冲突或单候选失败可能留下半套图片：Task 4 固定整组失败/回退和冲突测试，Task 5 做最终产物门禁。

---

### Task 1: 中性黑白设计系统

**Files:**
- Modify: `index.html`
- Modify: `src/styles/shared.ts`
- Modify: `src/styles/home.ts`
- Modify: `src/styles/hero.ts`
- Modify: `src/styles/page.ts`
- Modify: `src/styles/prose.ts`
- Modify: `src/styles/publications.ts`
- Modify: `src/components/TokamakScene.tsx`
- Modify: `src/components/Header.tsx`
- Test: `webpack-plugins/prepaint.test.ts`

**Interfaces:**
- Produces: 中性语义令牌 `--bg`、`--bg-soft`、`--bg-deep`、`--bg-card`、`--text`、`--text-muted`、`--line`、`--line-strong`、`--accent`、`--accent-ink`、`--on-accent` 及灰阶 RGB/阴影令牌，供所有后续任务使用。

- [ ] **Step 1: 更新首屏测试并确认失败**

在 `prepaint.test.ts` 断言亮主题包含 `--bg: #f6f6f5`、`--text: #121212`、`--accent: #161616`、`--on-accent: #ffffff`，暗主题包含 `--bg: #090909`、`--text: #f4f4f4`、`--accent: #f2f2f2`、`--on-accent: #111111`；断言模板不再包含 `#9333ea`、`#e05cff`、`#8b5cf6`，并包含 `color-scheme` 与新 `theme-color`。

- [ ] **Step 2: 运行测试确认旧模板不满足新令牌**

Run: `node --test webpack-plugins/prepaint.test.ts`
Expected: FAIL，指出旧紫色令牌或缺失的 `--on-accent`。

- [ ] **Step 3: 实现黑白令牌与视觉清理**

将首屏令牌映射为上述中性值，保留现有变量别名以减少无关改动；同步主题 bootstrap 和切换时的 `theme-color`。清除 SVG、按钮、data-URI、附件页中的彩色硬编码，以边框、留白、字重和中性阴影替代彩色辉光，保留切角/HUD/网格和现有动画语义。

- [ ] **Step 4: 运行首屏测试和类型检查**

Run: `node --test webpack-plugins/prepaint.test.ts && npx tsc -b`
Expected: PASS，无类型错误。

### Task 2: 语义化容器响应式

**Files:**
- Create: `src/styles/responsive.ts`
- Modify: `src/styles/layout.ts`
- Modify: `src/styles/hero.ts`
- Modify: `src/styles/home.ts`
- Modify: `src/styles/shared.ts`
- Modify: `src/styles/page.ts`
- Modify: `src/styles/prose.ts`
- Modify: `src/styles/publications.ts`
- Test: `webpack-plugins/responsive-style.test.ts`

**Interfaces:**
- Produces:
  - `containers`：命名值 `site-header`、`hero`、`hero-stats`、`shell`、`site-footer`、`timeline`、`product-console`、`prose`。
  - `containerSizes`：`actions: '40rem'`、`stats: '47.5rem'`、`split: '60rem'`、`threeUp: '67.5rem'`。
  - `container(name: ContainerName): string`，返回 `container: <name> / inline-size;`。
  - `fromContainer(name: ContainerName, size: ContainerSize): string`，返回 `@container <name> (width >= <size>)`。

- [ ] **Step 1: 编写容器 helper 失败测试**

断言 `container('shell')` 与 `fromContainer('shell', 'split')` 的精确输出；断言所有尺寸只存在于 `containerSizes`，所有查询使用移动优先 `width >=`，并扫描 `src/styles` 确认没有 `@media (max-width` / `@media (min-width`。

- [ ] **Step 2: 运行测试确认 helper 尚不存在**

Run: `node --test webpack-plugins/responsive-style.test.ts`
Expected: FAIL，模块不存在或旧媒体查询仍存在。

- [ ] **Step 3: 实现 helper 和组件容器边界**

Header、Hero、HeroStatBar、Shell/ShellWide、Footer、Timeline、ProductConsole、Prose 使用命名容器；子元素通过 `fromContainer` 变形，grid 不查询自身。阈值只能引用 `containerSizes`。

- [ ] **Step 4: 用 intrinsic 布局替代不必要的查询**

CardGrid/Split/VerifyGrid 使用 `auto-fit/minmax` 和 `min(100%, …)`；FooterBottom 使用 wrapping；Band/Section 使用 `clamp()`；ConsoleReadout、DataTree、正文表格/媒体在窄容器中可读且不溢出。Hero 仅保留真实视口高度，移除全部视口宽度查询。

- [ ] **Step 5: 运行响应式测试、lint 和类型检查**

Run: `node --test webpack-plugins/responsive-style.test.ts && npm run lint && npx tsc -b`
Expected: PASS，无视口宽度媒体查询或 lint/type 错误。

### Task 3: 响应式图片组件与 MDX 标记

**Files:**
- Create: `src/lib/responsive-image.ts`
- Create: `src/components/ResponsiveImage.tsx`
- Modify: `src/content/products/service_tokamak.mdx`
- Modify: `src/content/products/service_frc.mdx`
- Modify: `src/styles/prose.ts`
- Test: `webpack-plugins/responsive-image.test.ts`

**Interfaces:**
- Produces:
  - `IMAGE_VARIANT_WIDTHS: readonly [480, 800, 1200, 1600]`。
  - `imageVariantUrl(src: string, width: number): string`，把 `/a.webp` 映射为 `/a-480.webp` 并保留 query/hash。
  - `buildResponsiveSrcSet(src: string, intrinsicWidth: number): string`，生成小于原宽的候选并追加唯一的原宽 base，按宽度升序。
  - `responsiveImageAttributes(src: string, intrinsicWidth: number)`，返回 `{ src, srcSet, sizes: 'auto, 100vw', loading: 'lazy', decoding: 'async' }`。
  - `ResponsiveImage(props: { src: string; alt: string; width: number; height: number; displayWidth?: number; caption?: string })`，展开上述纯属性并输出固有宽高。

- [ ] **Step 1: 编写 srcSet 与图片属性失败测试**

覆盖 1000px 源图输出 `480/800/1000`、771px 源图输出 `480/771`、800px 源图不重复 base、2100px 源图输出 `480/800/1200/1600/2100`；覆盖 query/hash，以及 `responsiveImageAttributes` 的 lazy/auto sizes/decoding 契约。组件 SSR 输出由 Task 5 的完整构建和预渲染检查验证。

- [ ] **Step 2: 运行测试确认 helper 尚不存在**

Run: `node --test webpack-plugins/responsive-image.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现纯 helper 与组件**

组件只进行确定性字符串计算，不访问浏览器 API；使用居中 figure、可选 figcaption、`width:100%`、`height:auto` 和 `max-width` 展示槽位，不为小图放大。

- [ ] **Step 4: 替换两份 MDX 的旧图片标记**

使用固有尺寸：banana 1000×800、fisbone 771×651、psi_pres_con 640×480、ppcfad02bcsupp2 2100×1000、frc 1300×450；展示上限依次为 1000、771、640、1200、1200px。移除 `<center>`、`align`、百分比宽度和“图片名称”，改为内容相关 alt。

- [ ] **Step 5: 运行图片 helper 测试和类型检查**

Run: `node --test webpack-plugins/responsive-image.test.ts && npx tsc -b`
Expected: PASS，MDX 组件导入和 props 类型正确。

### Task 4: WebP 多宽度生成、缓存与发布

**Files:**
- Modify: `webpack-plugins/webp.ts`
- Modify: `webpack.config.mjs`
- Modify: `scripts/prerender.mjs`
- Test: `webpack-plugins/webp.test.ts`

**Interfaces:**
- Consumes: `IMAGE_VARIANT_WIDTHS` from `src/lib/responsive-image.ts`。
- Produces: `WebpToolOptions.variantWidths?: readonly number[]`；`EncodeOptions` 增加可选 `width`；base `name.webp` 与变体 `name-<width>.webp` 可由 dev middleware 和 build assets 获取。

- [ ] **Step 1: 添加变体失败测试**

在现有 Sharp 测试中要求：480px 动图变体保留帧数和比例；小于 480px 或候选大于源宽时不放大；缓存键随 `width` 改变；build 同时发布 base/变体且不再发布源 GIF；dev 能服务 `name-480.webp` 并覆盖新增源图重扫。

- [ ] **Step 2: 添加冲突与整组失败测试**

覆盖已有 `a-480.webp`、另一源图占用变体名、任一变体编码失败；期望不覆盖用户文件、不发布或引用半套响应式图片，并给出可定位错误。

- [ ] **Step 3: 运行新增测试确认旧管线失败**

Run: `node --test webpack-plugins/webp.test.ts`
Expected: FAIL，旧管线只生成 base 或缓存未区分宽度。

- [ ] **Step 4: 实现变体管线**

读取一次源尺寸，过滤候选后生成变体和原宽 base；`rotate()` 后按宽度 resize，动图显式 `animated:true`。缓存键加入宽度和新语义版本；按编码任务限流。扫描/冲突表覆盖变体，assets 整组发布，middleware 解析变体 URL；loader 仍只改写 base URL。webpack 与预渲染的 WebpPlugin 均传入共享 `IMAGE_VARIANT_WIDTHS`。

- [ ] **Step 5: 运行 WebP 全量测试**

Run: `node --test webpack-plugins/webp.test.ts`
Expected: PASS，既有 EXIF、缓存、passthrough、loader 和中间件测试无回归。

### Task 5: 预渲染图片门禁与完整验证

**Files:**
- Modify: `webpack-plugins/prerender.ts`
- Modify: `scripts/prerender.mjs`
- Test: `webpack-plugins/prerender.test.ts`

**Interfaces:**
- Produces: 可单测的 HTML 图片引用/srcSet 候选提取与响应式属性校验函数；`scripts/prerender.mjs` 在写页面前调用，并对每个站内候选检查 `dist` 文件存在。

- [ ] **Step 1: 编写预渲染失败测试**

覆盖双/单引号、多候选 `srcSet`、query/hash、编码路径、外链/data URL、缺失变体；要求 `w` srcSet 有 sizes、数值 width/height 和 alt，`sizes` 以 auto 开头时必须有 `loading="lazy"`。

- [ ] **Step 2: 运行测试确认旧提取器漏检**

Run: `node --test webpack-plugins/prerender.test.ts`
Expected: FAIL，旧正则无法完整解析 React srcSet 或属性契约。

- [ ] **Step 3: 实现校验并接入写盘前门禁**

复用纯函数提取每个候选 URL，站内路径 decode 后检查产物；校验失败时不写 HTML。保留既有 sitemap、robots、OG 和 404 行为。

- [ ] **Step 4: 运行完整静态门禁**

Run: `npm run lint && npm test && npm run build`
Expected: 全部 PASS；生产构建含所有路由、base/变体 WebP、sitemap、robots 和 404，无缺失图片或 hydration 构建错误。

- [ ] **Step 5: 在真实页面做响应式与视觉验收**

启动 dev 与 production preview，检查首页、产品正文、共享内页和附件页。覆盖 320/375/640/768/960/1080/1440/1920px、横屏、200% 缩放、light/dark 和 reduced-motion；单独缩窄组件容器验证 Header 不随视口误切换。检查移动菜单、键盘焦点、锚点、横向溢出、控制台 hydration 警告，以及 DPR 1/2 下的 `currentSrc`、候选 200、动画和 CLS。若当前环境无法执行某项浏览器检查，明确记录未验证项，不以类型/单元测试代替。

- [ ] **Step 6: 请求最终代码审查**

使用 requesting-code-review 技能检查需求覆盖、容器边界、图片失败路径与改动范围；按验证结果修正，不提交代码，除非用户另行要求。
