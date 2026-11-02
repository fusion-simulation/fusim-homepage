# 内容页（MDX）阅读体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让所有 MDX 内容页（产品详情、产品分类、普通页面）拥有统一页头、约 860px 的阅读列、统一的标题层级（h5 不再退化）和稳定的图片尺寸。

**Architecture:** 页头复用现有 `PageHeader`，由 `MdxPage` 统一渲染；正文排版集中在 `prose.ts`（`ProseArticle` 改为固定阅读宽度，补齐 h5 与字号节奏）。`ResponsiveImage` 不改动，图片始终在正文列内显示。

**Tech Stack:** React 19、styled-components 6、wouter、webpack 5 + MDX loader、TypeScript、Biome。

**Spec:** `docs/superpowers/specs/2026-11-02-content-page-readability-design.md`

## Global Constraints

- 不新增依赖；样式继续使用 styled-components。
- 不新增视口媒体查询；布局变化用容器查询（`fromContainer`）或 `clamp()`。
- 不修改 MDX 正文、图片文件与 frontmatter 数据。
- 不修改 `journal` 页面（已有自己的页头与 `JournalArticle`）。
- 门禁：`npx tsc -b`、`npx biome check`、`npm test`、`npm run build` 全部通过。
- 不提交 git commit，除非用户另行要求。

## Review Focus

1. 窄屏（375px）下标题、正文、图片无横向溢出 — 由 Task 3 的截图检查覆盖。
2. `wide: true` 的旧页面（`service_tokamak`、`service_frc`）不再出现 1300px 长行 — 由 Task 2 的 `max-width` 与 Task 3 的截图覆盖。
3. 没有 `description` 的页面页头不出现空段落 — 由 Task 1 的条件渲染覆盖。

## Design Deviations（已记录）

- 设计中的"宽图突出至 1200px"未实施：`ProseCard` 带 `overflow: hidden`，突出部分会被裁切。图片统一在正文列内显示（不超过约 800px），由 `ResponsiveImage` 原有的 `max-width` 控制。
- 设计中的"多图分组网格"未实施：MGI 三联图实际是一张合成 GIF，无需分组。
- 页头眉题使用英文 mono 眉题（与 `ProductsPage` 等现有页头一致）：产品 → `Products`，产品分类 → `Solutions`，普通页面 → `Page`。

---

### Task 1: 统一页头

**Files:**
- Modify: `src/pages/MdxPage.tsx`

**Interfaces:**
- Consumes: `PageHeader`（`src/components/PageHeader.tsx`，props：`eyebrow: string`、`title: string`、`description?: string`）；`ContentPage`、`ContentKind`（`src/lib/content.ts`）。
- Produces: `MdxPage` 对 `product` / `product_section` / `page` 三类统一渲染 `<PageHeader>`；`journal` 分支保持不变。

- [ ] **Step 1: 增加眉题映射**

在 `MdxPage.tsx` 顶部新增常量（不要导出）：

```tsx
const EYEBROW_BY_KIND: Record<'product' | 'product_section' | 'page', string> = {
  product: 'Products',
  product_section: 'Solutions',
  page: 'Page',
}
```

- [ ] **Step 2: 改写非 journal 分支**

将 `kind === 'product' || kind === 'product_section'` 分支与末尾的 `return <Component />` 合并为一个分支，返回：

```tsx
<>
  <PageHeader
    eyebrow={EYEBROW_BY_KIND[kind]}
    title={frontmatter.title ?? ''}
    description={frontmatter.description}
  />
  <ProseArticle>
    {kind === 'product' ? (
      <ProseCard>
        <Component />
      </ProseCard>
    ) : (
      <Component />
    )}
  </ProseArticle>
</>
```

要点：
- 不再传 `$wide`（宽度统一由 Task 2 决定）。
- `ProseArticle` 与 `ProseCard` 的 import 保留；新增 `import { PageHeader } from '../components/PageHeader'`。
- 当 `frontmatter.description` 为空时，`PageHeader` 已自行省略描述段落，无需额外判断。

- [ ] **Step 3: 类型检查**

Run: `npx tsc -b`
Expected: 无错误输出，退出码 0。

- [ ] **Step 4: Commit 不做**（见 Global Constraints）

---

### Task 2: 正文阅读列与标题层级

**Files:**
- Modify: `src/styles/prose.ts`

**Interfaces:**
- Consumes: 无新增依赖。
- Produces: `ProseArticle` 不再接受 `$wide` 属性（Task 1 已停止传入）；`proseCss` 新增 h5 样式。

- [ ] **Step 1: 固定阅读列宽度，去掉 `$wide`**

将 `ProseArticle` 替换为：

```ts
/** 内容页正文列：固定阅读宽度（约 860px），两侧留白与站点 Shell 对齐。 */
export const ProseArticle = styled.article`
  ${container(containers.prose)}
  ${proseCss}
  width: min(100% - 14vw, 860px);
  margin: 0 auto;
  padding: 0 0 24px;
  font-size: 1.0625rem;
`
```

要点：`container(containers.prose)` 保留，便于容器查询；`padding-top` 为 0，因为页头已占据上方间距。

- [ ] **Step 2: 补齐 h5 与标题节奏**

在 `proseCss` 中，`& h4` 之后新增：

```ts
  & h5 {
    font-size: 1.15rem;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--text);
    margin-top: 36px;
  }
```

并把 `& h2` 的字号改为 `font-size: clamp(1.3rem, 4vw, 1.6rem);`，使窄屏下 h2 不超过 1.6rem 且不小于 1.3rem。

- [ ] **Step 3: 类型检查与 Lint**

Run: `npx tsc -b && npx biome check`
Expected: 两者均无错误。若 Biome 对 CSS-in-JS 模板报告格式问题，运行 `npx biome check --write` 后重新检查。

---

### Task 3: 构建与视觉验证

**Files:**
- 无源码改动；临时截图放在 `tmp/`，验证结束后删除 `tmp/`。

- [ ] **Step 1: 全量门禁**

Run: `npm test && npm run build`
Expected: 测试通过；构建成功，`dist/` 下生成 `products/service_tokamak/index.html` 等页面。

- [ ] **Step 2: 启动预览并截图**

Run（在项目根目录）：`mkdir -p tmp && (PORT=4173 nohup node scripts/preview.mjs > tmp/preview.log 2>&1 &)`
然后用 Chromium 截图（路径为 `$HOME/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`）：
- 桌面：`--window-size=1440,4200 --screenshot=tmp/tokamak-desk.png http://localhost:4173/products/service_tokamak/`
- 移动：`--window-size=390,3000 --screenshot=tmp/tokamak-mobile.png http://localhost:4173/products/service_tokamak/`
- 同样检查 `/products/service_frc/` 与 `/products/cbaldur/`。

Expected（逐项目视检）：
- 页面顶部出现"托卡马克装置"标题与描述。
- 正文列宽度约 860px，桌面端不再出现超长行。
- h5 小节标题明显大于正文。
- 手机端图片不超出屏幕，标题不超过约 1.6rem。

- [ ] **Step 3: 清理**

Run: `pkill -f "scripts/preview.mjs"; rm -rf tmp`
Expected: 预览进程停止，`tmp/` 目录不存在；`git status` 只显示计划内修改的文件。

---

## Self-Review

- **Spec coverage**：页头（Task 1）、阅读宽度与字号（Task 2）、h5 与标题（Task 2）、移动端（Task 3 截图）覆盖设计目标；图片突出与分组网格按"设计偏差"记录，不实施。
- **Type consistency**：`EYEBROW_BY_KIND` 的键与 `ContentKind` 中非 journal 的三类一致；`ProseArticle` 去掉 `$wide` 后，唯一调用点（Task 1）已同步。
- **Step scan**：每步可直接执行；无占位文字。
