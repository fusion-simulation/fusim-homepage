# Griffel → styled-components 迁移实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 styled-components 替掉 Griffel，仓库源码中不再有任何 `.css` 文件，并把数学公式改为构建期 MathJax v4 SVG 渲染，同时只保留 SPA 构建。

**Architecture:** `src/styles/*.ts` 从 `makeStyles` 样式对象改为导出 styled 组件；页面用组件替代 `className`，变体用 `$` 前缀的 transient props；`global.css` 搬进 `createGlobalStyle`；数学公式由一个自写的 rehype 插件在 MDX 编译期调用 `@mathjax/src@4` 输出自包含 SVG。

**Tech Stack:** React 19、wouter 3、styled-components 6、Vite 8、MDX、`@mathjax/src` 4（仅构建期）。

**Spec:** `docs/superpowers/specs/2026-10-31-styled-components-migration-design.md`

## Global Constraints

- styled-components 版本 `^6.6.0`；**不加** `babel-plugin-styled-components`，dev 下类名保持默认哈希。
- 数学公式用 `@mathjax/src@^4.1.3`（devDependency，仅构建期）；不引入运行时 MathJax JS。
- 源码目录不允许出现 `.css` 文件（`src/`、`vite-plugins/`、`scripts/`）；`node_modules` 与 `dist` 除外。
- 不实现 `ServerStyleSheet`：项目无 SSR / 预渲染。
- 颜色仍写 `var(--*)`；暗色主题仍由 `index.html` 内联脚本设置 `html[data-theme]` 驱动，**不引入** `ThemeProvider`。
- 中文文案、DOM 结构（除组件包装外）、路由、MDX 内容一律不变。
- transient props 一律 `$` 前缀（`$variant`、`$delay`、`$open`、`$wide`、`$placement`、`$side`、`$short`）；被页面使用的样式组件一律 PascalCase 命名。
- 每个 task 结束时 `npx tsc -b` 与 `npm run lint` 必须通过。

## Review Focus

- **主题图标互斥**：light 主题只显示太阳、dark 只显示月亮；`GlobalStyle` 里旧的 `.theme-toggle-icon-*` 规则删除后由 `styled(SunIcon)` / `styled(MoonIcon)` 接管。（Task 3）
- **≤960px 导航**：关闭时 `display: none`，展开时纵向排列在品牌行下方，header 第一行仍是「品牌 + 主题/菜单按钮」。（Task 3）
- **产品卡片两种分支**：内部路由（wouter `Link`）与外链（`<a target="_blank">`）都必须保留卡片样式、整卡可点。（Task 2）
- **非法 TeX 不中断构建**：`\frac{` 这类残缺公式仍应产出 SVG（MathJax 的 merror），构建失败即为 bug。（Task 6 自动化测试）
- **`Section` 的后代规则叠加**：`& h2` / `& p` / `& ul` 与 `Card`、`Quote`、`Meta` 叠加后与迁移前一致（`Quote` 的 serif 与左边框不能被盖掉）。（Task 2 / Task 4）
- **`Card as="article"` 语义**：列表卡片在迁移后仍输出 `<article>`，不是 `<div>`。（Task 2）

---

### Task 1: 全局样式搬进 `createGlobalStyle`

**Files:**
- Modify: `package.json`（新增 `styled-components`）
- Create: `src/styles/global.ts`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Delete: `src/styles/global.css`

**Interfaces:**
- Consumes: 无
- Produces: `src/styles/global.ts` 导出 `GlobalStyle`（`createGlobalStyle` 组件），在 `App` 中渲染一次。

- [ ] **Step 1: 安装依赖**

Run: `npm install styled-components@^6.6.0`
Expected: `package.json` 的 `dependencies` 出现 `styled-components`，`node_modules/styled-components` 存在。

- [ ] **Step 2: 新建 `src/styles/global.ts`**

把 `src/styles/global.css` 的**全部内容**原样搬进 `createGlobalStyle` 模板字符串（`:root` 变量、`html[data-theme="dark"]` 覆盖、`*` 重置、`body`、`a`、`.theme-toggle-icon-*` 的显隐规则、`@keyframes fadeUp` 全部保留）。`fadeUp` 在 Task 2 才会改由 `animation.ts` 的 `keyframes` 生成，这里先不要删，否则中间态入场动画会失效。

```ts
import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  /* :root / dark / 重置 / body / a / theme-toggle-icon 规则，逐条照搬 global.css */
`
```

- [ ] **Step 3: 在 `App.tsx` 渲染 `GlobalStyle`**

`App` 的两个返回分支（附件目录页、`Layout`）外层包一个 fragment，第一项写 `<GlobalStyle />`。

- [ ] **Step 4: 删除 CSS 入口**

删 `src/main.tsx` 的 `import './styles/global.css'` 与 `src/styles/global.css` 文件本身。

- [ ] **Step 5: 验证**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: 三条命令全部成功；`ls dist/assets/*.css` 仍存在（KaTeX 的 CSS，Task 6 移除）；`find src -name '*.css'` 无输出。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/styles/global.ts src/App.tsx src/main.tsx src/styles/global.css docs/superpowers
git commit -m "refactor: 全局样式改由 createGlobalStyle 提供"
```

---

### Task 2: `animation` / `shared` / `hero` 三个样式模块 + 它们的消费页面

**Files:**
- Create: `src/styles/animation.ts`
- Rewrite: `src/styles/shared.ts`
- Modify: `src/styles/global.ts`（删除 `@keyframes fadeUp`）
- Rewrite: `src/styles/hero.ts`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/AboutPage.tsx`
- Modify: `src/pages/ResponsibilityPage.tsx`
- Modify: `src/pages/JournalPage.tsx`
- Modify: `src/pages/PressPage.tsx`
- Modify: `src/pages/NotFoundPage.tsx`
- Modify: `src/pages/ProductsPage.tsx`
- Modify: `src/pages/PublicationsPage.tsx`（只改 `useSharedStyles` 部分，`useDataTreeStyles` 留给 Task 5）
- Modify: `src/pages/MdxPage.tsx`（只改 `kind === 'journal'` 分支，`prose` 部分留给 Task 4）

**Interfaces:**
- Consumes: Task 1 的 `GlobalStyle`
- Produces:
  - `animation.ts`：`fadeUp`（`keyframes` 结果）、`RevealProps = { $delay?: number }`、`reveal`（`css<RevealProps>` 片段，`animation-delay: $delay * 0.15s`）、`Reveal`（`styled.div<RevealProps>`）。
  - `shared.ts`：`Section`(`styled.section`)、`Meta`(`styled.p`)、`CardGrid`(`styled.div`)、`Card`(`styled.div<RevealProps>`)、`CardLink`(`styled(Link)<RevealProps>`)、`CardAnchor`(`styled.a<RevealProps>`)、`Split`、`Quote`(`styled.p`)、`Timeline`、`TimelineItem`(`styled.div<RevealProps>`)、`HeroTag`(`styled.p`)、`CardTag`(`styled(HeroTag)`)、`YearHeading`(`styled.h3`)、`ButtonVariant = 'primary' | 'secondary' | 'accent' | 'light'`、`BtnLink`(`styled(Link)<{ $variant: ButtonVariant }>`)、`BtnAnchor`(`styled.a<{ $variant: ButtonVariant }>`)、`ButtonIcon`(`styled(ExternalLinkIcon)`)、`ButtonRow`(`styled.p`，`margin-top: 24px`)。
  - `hero.ts`：`Hero`(`styled.section`)、`HeroText`(`styled.div<RevealProps>`)、`HeroTitle`(`styled.h1`)、`HeroDescription`(`styled.p`)、`HeroActions`(`styled.div`)、`HeroVisual`(`styled.aside<RevealProps>`)、`MockFrame`、`MockTopbar`、`MockDot`(`styled.span`)、`MockTopbarText`(`styled.p`)、`MockBody`、`MockMetrics`、`MockMetric`、`MockMetricValue`(`styled.strong`)、`MockMetricLabel`(`styled.p`)、`MockScreen`、`MockGradient`、`MockLine`(`styled.div<{ $short?: boolean }>`)、`FloatCard`(`styled.div<{ $side: 'left' | 'right' }>`)、`FloatTitle`(`styled.p`)、`FloatRow`(`styled.div<{ $short?: boolean }>`)、`FloatTag`(`styled.div`)。

- [ ] **Step 1: 新建 `src/styles/animation.ts`**

`fadeUp` 用 `keyframes` 表达（原 `global.css` 的 `@keyframes fadeUp`：`to { opacity: 1; transform: translateY(0); }`）。`reveal` 片段包含 `opacity: 0; transform: translateY(12px); animation: ${fadeUp} 0.8s ease forwards;` 与 `animation-delay: ${({ $delay = 0 }) => `${$delay * 0.15}s`};`。同时删掉 `src/styles/global.ts` 里的 `@keyframes fadeUp` 块（否则与 `keyframes` 生成的作用域名重复定义）。

- [ ] **Step 2: 重写 `src/styles/shared.ts`**

按 `Interfaces` 的清单定义组件，CSS 值逐条照搬旧 `makeStyles` 对象的对应键（`section`→`Section`、`card`→`Card`、`button`→按钮片段、`reveal`/`delay*`→`animation.ts`）。要点：

- `Section`、`Card`、`TimelineItem` 的嵌套规则（`& h2` / `& p` / `& ul` / `& h4` / `& span`）与 `@media (max-width: 960px)` 保持原样。
- `Card` 与 `CardLink` / `CardAnchor` 共用同一个 `cardCss` 片段（`css` 结果），并叠加 `${reveal}`。
- 按钮共用 `buttonCss`（`display: inline-flex` 等 + `&:hover` + 按 `$variant` 分支的四套颜色），`BtnLink`/`BtnAnchor` 分别 `styled(Link)`/`styled.a`。
- `$variant` 必填（不给默认值），这样漏写变体会被 `tsc` 抓出来。
- 文件顶部注释说明「本模块只放站点级复用样式，页面仅本地用一次的 styled 组件可以就写在页面文件里」。

- [ ] **Step 3: 重写 `src/styles/hero.ts`**

按 `Interfaces` 清单逐个映射旧键；`HeroText`、`HeroVisual` 内联 `${reveal}`，`MockLine`/`FloatRow` 的 `...Short` 改成 `$short`，`floatCardLeft`/`floatCardRight` 合成 `$side`。

- [ ] **Step 4: 更新 `HomePage.tsx`**

`<section className={c.hero}>` → `<Hero>`；`<div className={mergeClasses(c.heroText, s.reveal)}>` → `<HeroText>`；`<aside className={mergeClasses(c.heroVisual, s.reveal, s.delay1)}>` → `<HeroVisual $delay={1}>`；两个 `floatCard` → `<FloatCard $side="left|right">`；按钮 → `<BtnLink $variant="primary|accent">` / `<BtnAnchor $variant="light">`，其中「访问产品文档」内的 `<ExternalLinkIcon className={s.buttonIcon}>` → `<ButtonIcon />`；`mergeClasses(c.floatRow, c.floatRowShort)` → `<FloatRow $short>`。删除 `mergeClasses`、`useHeroStyles`、`useSharedStyles` 的 import 与调用。

- [ ] **Step 5: 更新 5 个简单页面**

`AboutPage` / `ResponsibilityPage` / `JournalPage` / `PressPage` / `NotFoundPage`：`<div className={s.reveal}>` → `<Reveal>`，`mergeClasses(s.card, s.reveal, s.delayN)` → `<Card as="article" $delay={N}>`（About/Responsibility 的 div 卡片不带 `as`），`mergeClasses(s.heroTag, s.cardTag)` → `<CardTag>`，`s.timelineItem` → `<TimelineItem $delay={N}>`，`NotFoundPage` 的内联 `style={{ marginTop: 24 }}` → `<ButtonRow>`。

- [ ] **Step 6: 更新 `ProductsPage.tsx`**

`ProductCard` 内 `const className = mergeClasses(s.card, s.reveal, s.delay1)` 删除：外链分支用 `<CardAnchor $delay={1} href={externalUrl} target="_blank" rel="noopener noreferrer">`，内部路由用 `<CardLink $delay={1} href={product.url}>`。

- [ ] **Step 7: 更新 `PublicationsPage.tsx` 的 shared 部分**

`Section` / `Reveal` / `CardGrid` / `Card as="article" $delay={1}` / `Meta` / `YearHeading`；`useDataTreeStyles()` 与其 `pub.dataFiles` 保持不动。

- [ ] **Step 8: 更新 `MdxPage.tsx` 的 journal 分支**

`<section className={s.section} id="journal-post">` → `<Section id="journal-post">`；`s.reveal` → `<Reveal>`；`s.heroTag` → `<HeroTag>`；`s.meta` → `<Meta>`；`<article className={mergeClasses(s.card, s.reveal, s.delay1)} style={{ marginTop: 24 }}>` → 在页面文件内定义 `const JournalArticle = styled(Card)`\`margin-top: 24px;\``，写成 `<JournalArticle as="article" $delay={1}>`（`Card` 本身是 `styled.div`，`as` 保证仍输出 `<article>`）。

- [ ] **Step 9: 验证（类型 / lint / 构建 / 结构）**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: 全部通过。再执行：

```bash
grep -rn "useSharedStyles\|useHeroStyles\|mergeClasses" src/pages               # 期望：无输出（Header 的 mergeClasses 由 Task 3 处理）
grep -rn "makeStyles" src/styles                                                 # 期望：只剩 layout/prose/publications
grep -rn 'as="article"' src/pages                                               # 期望：Journal/Publications/MdxPage 共 3 处
```

- [ ] **Step 10: 人工检查（dev）**

Run: `npm run dev`，打开 `/`、`/about/`、`/products/`、`/publications/`。
Expected: 首页 hero 与浮层卡片位置不变；关于页两张卡片、引用块（serif + 左边框）正常；产品页卡片整块可点、外链卡片带 `target="_blank"`；论文页年份标题与卡片正常；入场动画仍有 0.15s 级联。

- [ ] **Step 11: Commit**

```bash
git add src/styles/animation.ts src/styles/shared.ts src/styles/hero.ts src/styles/global.ts src/pages
git commit -m "refactor: shared/hero 样式改为 styled 组件"
```

---

### Task 3: `layout` 样式模块 + Header / Footer / Layout

**Files:**
- Rewrite: `src/styles/layout.ts`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/styles/global.ts`（删除 `.theme-toggle-icon-*` 规则）

**Interfaces:**
- Consumes: Task 2 的 `RevealProps`（无需直接用，样式片段独立）
- Produces:
  - `layout.ts`：`Page`(`styled.div`)、`Content`(`styled.main`)、`HeaderBar`(`styled.header`)、`Brand`(`styled(Link)`)、`BrandMark`(`styled.span`)、`BrandText`(`styled.span`)、`BrandSub`(`styled.span`)、`Nav`(`styled.nav<{ $open: boolean }>`)、`NavLink`(`styled(Link)`)、`NavAnchor`(`styled.a`)、`HeaderActions`(`styled.div`)、`ThemeButton`(`styled.button<{ $placement: 'nav' | 'mobile' }>`)、`NavToggle`(`styled.button`)、`FooterBar`(`styled.footer`)、`FooterMeta`(`styled.div`)、`iconCss`（`width: 18px; height: 18px; display: block`）。

- [ ] **Step 1: 重写 `src/styles/layout.ts`**

逐键映射：`page`→`Page`、`content`→`Content`、`header`→`HeaderBar`、`brand`→`Brand`、`brandMark`→`BrandMark`、`brandText`→`BrandText`、`brandSub`→`BrandSub`、`nav`→`Nav`、`navLink`→`NavLink`、`headerActions`→`HeaderActions`、`themeToggle`→`ThemeButton`、`navToggle`→`NavToggle`、`footer`→`FooterBar`、`footerMeta`→`FooterMeta`；`useLayoutStyles` 的 `themeIcon` 与 `icon` 合并成导出的 `iconCss`。

`Nav` 的 `navMobileOpen` / `navMobileClosed` 合并成 `$open` 三元分支（只在 `@media (max-width: 960px)` 内生效）；`ThemeButton` 的 `themeToggleNav` / `themeToggleMobile` 合并成 `$placement` 分支（`nav`：`display: inline-flex` + 窄屏 `display: none`；`mobile`：`display: none` + 窄屏 `display: inline-flex`）；`NavAnchor` 与 `NavLink` 共用 `navLinkCss` 片段。

- [ ] **Step 2: 更新 `Header.tsx`**

删除 `mergeClasses` / `cx` / `useLayoutStyles`。文件内保留 `ThemeToggle` 这个本地组件，签名改成 `({ placement }: { placement: 'nav' | 'mobile' })`，内部渲染 `<ThemeButton $placement={placement} aria-label="切换主题" onClick={toggleTheme}>`（styled 的按钮叫 `ThemeButton`，避免与本地组件重名）。图标在文件内定义：

```tsx
const LightIcon = styled(SunIcon)`${iconCss} html[data-theme="dark"] & { display: none; }`
const DarkIcon = styled(MoonIcon)`${iconCss} display: none; html[data-theme="dark"] & { display: block; }`
```

`Nav` 用 `$open={open}`；五个 `<Link className={c.navLink}>` → `<NavLink>`；`docs.fusim.cn` 与 `#contact` 两个 `<a>` → `<NavAnchor>`；菜单按钮内 `<MenuIcon className={c.icon}>` / `<XIcon className={c.icon}>` → 文件内定义 `const Menu = styled(MenuIcon)`${iconCss}`` 与 `const Close = styled(XIcon)`${iconCss}`` 后使用。

- [ ] **Step 3: 更新 `Footer.tsx` / `Layout.tsx`**

`<footer className={c.footer}>` → `<FooterBar>`，两个 `<div className={c.footerMeta}>` → `<FooterMeta>`；`Layout` 的 `<div className={c.page}>` → `<Page>`、`<main className={c.content}>` → `<Content>`。

- [ ] **Step 4: 从 `GlobalStyle` 删除主题图标规则**

删掉 `.theme-toggle-icon-dark` / `.theme-toggle-icon-light` 三条规则（现在由 `styled(SunIcon)` / `styled(MoonIcon)` 承担），其余全局样式不动。

- [ ] **Step 5: 验证**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: 全部通过；`grep -rn "useLayoutStyles\|theme-toggle-icon" src` 无输出。

- [ ] **Step 6: 人工检查（dev，两个断点）**

Run: `npm run dev`
Expected: 宽屏下 header 吸顶、毛玻璃背景、导航右侧对齐；点主题按钮后图标从太阳切到月亮（两个主题各确认一次）；窗口缩到 ≤960px 时导航默认收起、点菜单展开为纵向列表且位于品牌行下方；页脚分隔线与两行备案信息正常。

- [ ] **Step 7: Commit**

```bash
git add src/styles/layout.ts src/components src/styles/global.ts
git commit -m "refactor: 页面框架样式改为 styled 组件"
```

---

### Task 4: `prose` 样式模块 + MDX 产品页

**Files:**
- Rewrite: `src/styles/prose.ts`
- Modify: `src/pages/MdxPage.tsx`

**Interfaces:**
- Consumes: Task 2 的 `Reveal` / `Section` 等（本 task 不新增依赖）
- Produces: `prose.ts` 导出 `proseCss`（`css` 片段）、`ProseArticle`(`styled.article<{ $wide?: boolean }>`)、`ProseCard`(`styled.div`)。

- [ ] **Step 1: 重写 `src/styles/prose.ts`**

`prose` 键 → `proseCss` 片段（内容逐条照搬，包含 `& > * + *`、`& h1`…`& h4`、`& p`、`& a`、`& a:hover`、`& ul`、`& ol`、`& li + li`、`& blockquote`、`& code`、`& pre`、`& pre code`）。`proseBox` / `proseBoxWide` 合并为 `ProseArticle` 的 `$wide` 分支（`maxWidth: 860px / 2400px`、`padding: 72px 7vw 20px / 72px 20px 20px`）。`proseCard` → `ProseCard`。

- [ ] **Step 2: 更新 `MdxPage.tsx` 的产品分支**

```tsx
<ProseArticle $wide={frontmatter.wide}>
```

`kind === 'product'` 时内部用 `<ProseCard>`。删除 `useProseStyles` 与 `mergeClasses`。

- [ ] **Step 3: 验证**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: 通过。

- [ ] **Step 4: 人工检查（dev）**

Run: `npm run dev`，打开 `/products/cbaldur/` 与一个 `wide: true` 的产品页。
Expected: 正文卡片有阴影与内边距；标题层级、行内 `code`、引用块、列表缩进与迁移前一致；宽版页面内容更宽且左右留白 20px。

- [ ] **Step 5: Commit**

```bash
git add src/styles/prose.ts src/pages/MdxPage.tsx
git commit -m "refactor: 正文排版样式改为 styled 组件"
```

---

### Task 5: `publications` 样式模块 + 文件树 / 附件目录页

**Files:**
- Rewrite: `src/styles/publications.ts`
- Modify: `src/components/DataTree.tsx`
- Modify: `src/pages/PublicationsPage.tsx`（`dataFiles` 部分）
- Modify: `src/pages/AttachmentDirPage.tsx`

**Interfaces:**
- Consumes: Task 2 的 `Section` / `Reveal` / `CardGrid` / `Card` / `Meta` / `YearHeading`
- Produces: `publications.ts` 导出 `TreeList`(`styled.ul`)、`TreeItem`(`styled.li`)、`TreeSize`(`styled.span<{ $variant?: 'site' | 'attachment' }>`)、`TreeFileLink`(`styled.a<{ $onAttachmentPage?: boolean }>`)、`TreeSummary`(`styled.summary`)、`TreeDirLink`(`styled.a`)、`TreeSubtree`(`styled.div`)、`DataFiles`(`styled.div`)、`AttachmentRoot`(`styled.div`)、`AttachmentInner`(`styled.div`)、`BackLink`(`styled.a`)、`AttachmentCard`(`styled.div`)。

- [ ] **Step 1: 重写 `src/styles/publications.ts`**

`useDataTreeStyles` 的键 → `TreeList`/`TreeItem`/`TreeSize`/`TreeSummary`/`TreeDirLink`/`TreeSubtree`/`DataFiles`；`fileLinkOnAttachmentPage` 与 `sizeOnAttachmentPage` 合并进对应组件的 `$` 变体（附件页配色 `#0056b3` / `#5b667a`；站点内不设颜色，继续继承全局 `a`）。`useAttachmentStyles` 的键 → `AttachmentRoot`/`AttachmentInner`/`BackLink`/`AttachmentCard`。

- [ ] **Step 2: 更新 `DataTree.tsx`**

删除 `mergeClasses` / `useDataTreeStyles`。`<TreeFileLink $onAttachmentPage={variant === 'attachment'}>`、`<TreeSize $variant={variant}>`；`variant` prop 名与默认值（`'site'`）不变，由调用方继续传。

- [ ] **Step 3: 更新 `PublicationsPage.tsx` / `AttachmentDirPage.tsx`**

`<div className={pub.dataFiles}>` → `<DataFiles>`；附件页 `c.root`/`c.inner`/`c.backLink`/`c.card` → `AttachmentRoot`/`AttachmentInner`/`BackLink`/`AttachmentCard`。删除两个页面对 `useDataTreeStyles` / `useAttachmentStyles` 的调用。

- [ ] **Step 4: 验证**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: 通过；`grep -rn "makeStyles" src/styles` 无输出。

- [ ] **Step 5: 人工检查（dev）**

Run: `npm run dev`
Expected: `/publications/` 的论文卡片、`附加文件：` 下的文件树（📄/📁、大小括号、展开箭头）正常；访问一个附件目录 URL（如 `/assets/pub/2026/1/`）时是白底、蓝色链接、返回上一级可点，且不带站点 header/footer。

- [ ] **Step 6: Commit**

```bash
git add src/styles/publications.ts src/components/DataTree.tsx src/pages
git commit -m "refactor: 论文附件样式改为 styled 组件"
```

---

### Task 6: MathJax v4 SVG 构建期渲染

**Files:**
- Create: `vite-plugins/mathjax.ts`
- Create: `vite-plugins/mathjax.test.ts`
- Modify: `vite-plugins/mdx.ts`
- Modify: `package.json`（移除 `katex` / `rehype-katex`，新增 devDependencies）
- Modify: `src/main.tsx`（删除 `import 'katex/dist/katex.min.css'`）

**Interfaces:**
- Consumes: 无（`mdx.ts` 的 `rehypePlugins` 数组）
- Produces: `vite-plugins/mathjax.ts` 导出 `mathjax(): (tree: Root) => Promise<void>`（unified rehype 插件），把 `remark-math` 产出的数学节点替换为 `<span class="math math-inline">` / `<div class="math math-display" style="text-align: center">` 包裹的自包含 `<svg>`。

- [ ] **Step 1: 安装/移除依赖**

```bash
npm install -D @mathjax/src@^4.1.3 hast-util-from-html hast-util-to-text unist-util-visit-parents @types/hast
npm uninstall katex rehype-katex
```

- [ ] **Step 2: 写失败测试 `vite-plugins/mathjax.test.ts`**

用 `node:test` + `node:assert/strict`（与 `webp.test.ts` 同风格），手搓 hast 树，不依赖 React/JSX：

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { mathjax } from './mathjax.ts'

const tree = (...children: any[]) => ({ type: 'root', children })
const element = (tagName: string, properties: any, children: any[] = []) =>
  ({ type: 'element', tagName, properties, children })
const text = (value: string) => ({ type: 'text', value })
```

五条断言（每条一个 `test`）：

1. 行内：`<code class="language-math math-inline">E = mc^2</code>` → 根节点第一个子节点是 `span`，`className` 含 `math-inline`，其首个子节点 `tagName === 'svg'`，序列化后含 `viewBox`，且不含 `@font-face` / `url(` 。
2. 行间：`<pre><code class="language-math math-display">\int_0^1 x\,dx</code></pre>` → 第一个子节点是 `div`，`className` 含 `math-display`，`style` 含 `text-align: center`，且整棵树里不再有 `pre`。
3. 非数学节点原样保留：`<p>hello</p>` 的 `tagName`/文本不变。
4. 非法 TeX 不中断：`\frac{` 这类残缺公式下插件不 reject，产出物仍是 `span.math-inline`（内部是 MathJax 的 merror SVG，或实现时降级出的错误节点）。
5. 缓存：同一棵树里两个相同公式，两次替换出的 `svg` 经 `JSON.stringify` 完全相等（`id` 前缀相同）。

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，报错指向 `vite-plugins/mathjax.ts` 不存在（`Cannot find module`）。

- [ ] **Step 4: 实现 `vite-plugins/mathjax.ts`**

参考实现（`createRequire` 可避免 Vite 配置打包阶段解析该包，模块级缓存让 dev 重编译复用同一实例）：

```ts
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { fromHtml } from 'hast-util-from-html'
import { toText } from 'hast-util-to-text'
import type { Root } from 'hast'
import { SKIP, visitParents } from 'unist-util-visit-parents'

type MathJaxLike = {
  startup: { promise: Promise<unknown>; adaptor: { serializeXML(node: unknown): string; tags(node: unknown, tag: string): unknown[] } }
  tex2svgPromise(tex: string, options: { display: boolean; em?: number; ex?: number }): Promise<unknown>
}

const cache = new Map<string, string>()
let loading: Promise<MathJaxLike> | undefined

async function loadMathJax(): Promise<MathJaxLike> {
  const g = globalThis as { MathJax?: any }
  g.MathJax = {
    loader: { paths: { mathjax: '@mathjax/src/bundle' }, load: ['adaptors/liteDOM'], require: (file: string) => import(file) },
    output: { font: 'mathjax-newcm', fontCache: 'local' },
    startup: { typeset: false },
  }
  const require = createRequire(import.meta.url)
  await import(pathToFileURL(require.resolve('@mathjax/src/bundle/tex-svg.js')).href)
  await g.MathJax.startup.promise
  return g.MathJax as MathJaxLike
}


export function mathjax() {
  return async (tree: Root) => { /* visitParents 替换节点，见下 */ }
}
```

`visitParents` 的判定与替换逻辑（这是本 task 唯一需要逐行照做的算法）：

- 读 `element.properties.className`，命中 `language-math` / `math-inline` / `math-display` 才处理。
- `language-math` 且 `tagName === 'code'` 且父节点是 `pre` 时，替换目标是 `pre`，`display = true`；否则目标是自身，`display = classes.includes('math-display')`。
- 文本用 `toText(target, { whitespace: 'pre' })`。
- 用 `fromHtml(svg, { fragment: true })` 把 SVG 字符串转回 hast，包一层 `{ type: 'element', tagName: display ? 'div' : 'span', properties: display ? { className: ['math','math-display'], style: 'text-align: center' } : { className: ['math','math-inline'] }, children: fragment.children }`，用 `parent.children.splice(index, 1, wrapper)` 替换。
- 异步渲染需要先收集任务再 `await Promise.all`，`visitParents` 回调里只入队。
- 单个公式渲染失败（MathJax 抛错）时降级成 `<span class="math math-inline">原文本</span>`，**整个 transform 不能 reject**：公式写错只应影响那一处，不应让 dev 页面白屏或构建失败。

`render` 的实现约束：

```ts
async function render(tex: string, display: boolean): Promise<string> {
  const key = `${display}:${tex}`
  const hit = cache.get(key)
  if (hit) return hit
  const mj = await (loading ??= loadMathJax())
  const node = await mj.tex2svgPromise(tex, { display, em: 16, ex: 8 })
  const svg = mj.startup.adaptor.serializeXML(mj.startup.adaptor.tags(node, 'svg')[0])
  cache.set(key, svg)
  return svg
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test`
Expected: 5 个测试全部 PASS（首次运行约 1–2s，MathJax 只加载一次）。

- [ ] **Step 6: 接入 `vite-plugins/mdx.ts`**

```ts
import { mathjax } from './mathjax.ts'
// ...
rehypePlugins: [mathjax()],
```

删除 `import rehypeKatex from 'rehype-katex'`，并更新文件头注释（KaTeX → MathJax v4 SVG）。

- [ ] **Step 7: 删除 `src/main.tsx` 的 KaTeX CSS import**

只删这一行 `import 'katex/dist/katex.min.css'`。

- [ ] **Step 8: 验证构建与产物**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: 全部通过；**`dist/assets/*.css` 不存在**（KaTeX 移除后已无任何 CSS 产物）；`find src vite-plugins scripts -name '*.css'` 无输出。

- [ ] **Step 9: 临时冒烟（MathJax 接线证明）**

在任意一个 `src/content/products/*.mdx` 末尾临时加一段 `行内测试：$E = mc^2$`，`npm run dev` 打开该页确认渲染出公式，然后**删掉这段临时内容**并确认 `git diff` 中该文件无改动。

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite-plugins/mathjax.ts vite-plugins/mathjax.test.ts vite-plugins/mdx.ts src/main.tsx
git commit -m "feat: 数学公式改用 MathJax v4 构建期 SVG 渲染"
```

---

### Task 7: 移除 Griffel、SPA 化清理与文档

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Delete: `src/lib/cx.ts`
- Delete: `src/entry-server.tsx`
- Delete: `scripts/prerender.mjs`
- Modify: `src/lib/meta.ts`
- Modify: `src/lib/useDocumentMeta.ts`（注释）
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 2–5 完成后已无任何 `@griffel/react` 引用
- Produces: 无新接口；仓库不再依赖 Griffel，也不再有预渲染入口。

- [ ] **Step 1: 移除 Griffel 依赖与构建配置**

```bash
npm uninstall @griffel/react @griffel/vite-plugin
```

`vite.config.ts`：删除 `import { griffel } from '@griffel/vite-plugin'`、`griffel()` 插件、`build.cssMinify: false` 及其注释；插件顺序注释改成「MDX 编译后的产物再进入 react/webp 的管线」。没有 SSR 之后 `isSsrBuild` 也没用了：把 `defineConfig(({ isSsrBuild }) => ({ ... }))` 改成 `defineConfig({ ... })`，同时删掉 `copyPublicDir: !isSsrBuild` 这一行（默认就是拷贝 public/）。

- [ ] **Step 2: 删除 `cx.ts` 与所有引用**

删 `src/lib/cx.ts`；`grep -rn "lib/cx" src` 确认无引用（Header 已在 Task 3 去掉）。

- [ ] **Step 3: 删除 SSG 链路**

- `package.json` 删 `"build:ssg"` 脚本。
- 删 `src/entry-server.tsx`、`scripts/prerender.mjs`。
- `src/lib/meta.ts` 删 `getStaticPaths` 与 `StaticPath` 类型（`resolveMeta`、`normalizePath`、`PageMeta` 保留）。
- `src/lib/useDocumentMeta.ts` 注释里的「构建期由预渲染脚本直接写入 HTML 头部」改为「首次进入时由本 hook 写入 `<title>` 与 description」。
- `src/main.tsx`：删掉 `hydrateRoot` 分支与 import，只保留 `createRoot(container).render(app)`（没有预渲染就不会有可 hydration 的 HTML），并把注释里提到 `build:ssg` 的那行删掉。

- [ ] **Step 4: 验证清理彻底**

```bash
grep -rn "griffel\|makeStyles\|mergeClasses" src vite-plugins vite.config.ts package.json README.md   # 期望：无输出
grep -rn "getStaticPaths\|build:ssg\|prerender" src scripts package.json README.md                    # 期望：无输出
```

- [ ] **Step 5: 更新 `README.md`**

- 首段技术栈与表格：`Griffel` → `styled-components`（组件化 CSS-in-JS，无 `.css` 文件）；
- 删除「Griffel 通过 @griffel/vite-plugin 在构建期抽取」整段，替换成一段说明：全局样式在 `src/styles/global.ts`（`createGlobalStyle`），组件样式在 `src/styles/*.ts`，数学公式由 `vite-plugins/mathjax.ts` 在构建期渲染成自包含 SVG；
- 常用命令删 `build:ssg` 行与「如果希望构建时就把每个路由写死成 HTML…」引用；
- 目录结构：删 `scripts/prerender.mjs`、`src/entry-server.tsx`，`vite.config.ts` 注释去掉 Griffel，`styles/` 描述改为「styled 组件（全局样式在 global.ts）」；
- 删除「Griffel 构建期抽取」相关的构建说明条目（`cssMinify` 那条）与所有 `build:ssg` / 预渲染段落（含「预渲染不重复转码」条目）；
- 部署一节删掉「若不确定托管平台是否支持回退，可使用 `npm run build:ssg`…」。

- [ ] **Step 6: 全量验证**

Run: `npx tsc -b && npm run lint && npm test && npm run build`
Expected: 四条命令全部通过；`find src vite-plugins scripts -name '*.css'` 无输出；`ls dist/assets/*.css` 不存在。

- [ ] **Step 7: 最终人工检查（dev）**

Run: `npm run dev`
Expected: 首页、/about/、/journal/、/press/、/products/、/publications/、/responsibility/ 各页在新窗口打开无报错；切换主题无闪烁；窄屏导航可展开；浏览器控制台无 React / styled-components 警告。

- [ ] **Step 8: Commit**

```bash
git add -A -- src vite-plugins scripts package.json package-lock.json vite.config.ts README.md docs
git commit -m "chore: 移除 Griffel 与预渲染链路，文档对齐 SPA + styled-components"
```

---

## 完成标准

- `grep -rn "griffel" -i . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git` 无输出。
- `find src vite-plugins scripts -name '*.css'` 无输出。
- `npm run build` 产物中没有 `.css` 文件。
- `npm test` 包含 MathJax 插件的 5 个用例并通过。
- 视觉与交互（暗色主题、≤960px 导航、入场动画、产品/论文卡片、附件目录页）与迁移前一致。
