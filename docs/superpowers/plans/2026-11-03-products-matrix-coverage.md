# 产品矩阵页重写：覆盖矩阵 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/products/` 从「两个同构区块 + 4 张卡」重写成一张能一屏读完的覆盖矩阵，让人看懂我们覆盖哪些物理过程、哪些装置、以什么形态交付。

**Architecture:** 数据（`src/content/product-matrix.ts`，纯常量 + 类型）+ 样式（`src/styles/matrix.ts`，grid 版式，用 `containers.shell` 变形）+ 页面（`src/pages/ProductsPage.tsx`，六段结构）。矩阵用 `<ul>` + 每行 `<h3>`，不用 `<table>`：窄屏要把行折成条目，对表元素 `display:block` 会破坏表格语义。

**Tech Stack:** React 19 + styled-components 6 + 容器查询（`src/styles/responsive.ts`）+ node:test（Node 24 原生 TS 剥离，测试直接 `import '../src/...ts'`）。

**Spec:** `docs/superpowers/specs/2026-11-03-products-matrix-coverage-design.md`

## Global Constraints

- 只用 `index.html` 已定义的令牌：`--accent` `--accent-deep` `--accent-ink` `--gold` `--text` `--text-muted` `--line` `--line-strong` `--bg-deep` `--bg-card` `--surface-translucent` `--font-mono` `--shadow-card` `--radius-*`（全部为 `0`）。不新增色值，不新增 keyframes。
- 不新增视口媒体查询。变形只用 `fromContainer(containers.shell, 'actions' | 'stats' | 'split' | 'threeUp')`。
- 新组件不得有 `window` / `matchMedia` / `document` 分支：SSR 与 CSR 必须输出一致 HTML。
- 状态只有三种：`delivered`（● 已交付案例）、`scoped`（○ 按需评估）、`planned`（○ 规划中）。**没有「不支持」**。
- CBaldur 侧只有 `平衡与位形` `磁流体稳定性` `输运` 三行为 `delivered`——与站点既有文案「覆盖从平衡到输运的完整物理链条」一致。其余五行 `scoped`，不冒充已上线。
- 事实只来自 `bp.pdf` 与现有 MDX。BP 未覆盖的数字（如「10+ 知识产权」）不引用。
- 标题层级：页面 `h1`（`PageHeader`）→ 区块 `h2` → 矩阵行 `h3`，不跳级。
- 门禁四条，全部必须通过：`npx tsc -b`、`npm run lint`、`npm test`、`npm run build`。

## Review Focus

1. **375px 下矩阵折成条目后，两个交付格是否仍带着列名**（「标准产品」「工程仿真方案」），否则访客分不清哪格是自助哪格是定制；同时页面不得出现横向滚动。
2. **暗色主题下状态点与行分隔线的对比度**：`--accent` 变 `#7aa2ff`、`--bg-deep` 变 `#06070a`；`●` / `○` 不能是唯一信息载体，必须配文字（图例 + 每格文案）。
3. **无 JS 时矩阵必须完整可见**：预渲染 HTML 里要有全部 8 行文字，`reveal` 只能影响透明度，不能把内容锁在 `opacity: 0`。
4. **删掉 `more_service.mdx` 后首页「产品矩阵」区块只剩 2 张卡**，不能塌陷成一行半、不能留空占位。
5. **长过程名换行**：「加热与电流驱动」（7 字）与「器壁与热负荷」在 3 列 grid 下不得把列宽挤歪；首列用固定宽度，两个交付列用 `minmax(0, 1fr)`。

---

### Task 1: 覆盖矩阵数据模块

**Files:**
- Create: `src/content/product-matrix.ts`
- Test: `webpack-plugins/product-matrix.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `type DeliveryState = 'delivered' | 'scoped' | 'planned'`
  - `type MatrixCell = { state: DeliveryState; text: string }`
  - `type MatrixProcess = { no: string; key: string; label: string; summary: string; saas: MatrixCell; service: MatrixCell; devices: readonly string[] }`
  - `type Solver = { no: string; label: string; text: string }`
  - `const processes: readonly MatrixProcess[]`（8 条）
  - `const solvers: readonly Solver[]`（5 条）
  - `const compute: { label: string; value: string; text: string }`
  - `const evidence: readonly { org: string; claim: string }[]`（4 条）
  - `const coverage: { processes: number; solvers: number; devices: number; evidence: number }`
  - `const legend: readonly { state: DeliveryState; label: string }[]`

- [ ] **Step 1: 写失败测试**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compute,
  coverage,
  evidence,
  legend,
  processes,
  solvers,
} from '../src/content/product-matrix.ts'

const STATES = ['delivered', 'scoped', 'planned']

test('矩阵是 8 类物理过程，编号连续、key 唯一', () => {
  assert.equal(processes.length, 8)
  assert.deepEqual(
    processes.map((p) => p.no),
    ['01', '02', '03', '04', '05', '06', '07', '08'],
  )
  assert.equal(new Set(processes.map((p) => p.key)).size, 8)
})

test('每个格子都落在三种状态内，且都有文案', () => {
  for (const p of processes) {
    for (const cell of [p.saas, p.service]) {
      assert.ok(STATES.includes(cell.state), `${p.key} 状态非法：${cell.state}`)
      assert.ok(cell.text.trim().length > 0, `${p.key} 缺少文案`)
    }
  }
})

test('CBaldur 只认前三行，其余按需评估，不冒充已上线', () => {
  assert.deepEqual(
    processes.filter((p) => p.saas.state === 'delivered').map((p) => p.key),
    ['equilibrium', 'mhd', 'transport'],
  )
})

test('概览数字从数据派生，写死的数字对不上就失败', () => {
  assert.equal(coverage.processes, processes.length)
  assert.equal(coverage.solvers, solvers.length)
  assert.equal(coverage.evidence, evidence.length)
  assert.equal(coverage.devices, 2)
})

test('5 类求解器与算力结论都有出处', () => {
  assert.equal(solvers.length, 5)
  assert.ok(solvers.every((s) => s.label.length > 0 && s.text.length > 0))
  assert.match(compute.value, /2\.0/)
  assert.ok(evidence.length > 0 && evidence.every((e) => e.org && e.claim))
})

test('图例覆盖全部状态，且没有「不支持」', () => {
  assert.deepEqual(
    legend.map((l) => l.state).sort(),
    ['delivered', 'planned', 'scoped'],
  )
  assert.ok(!legend.some((l) => /不支持|暂不|不可用/.test(l.label)))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test webpack-plugins/product-matrix.test.ts`
Expected: FAIL，`Cannot find module '../src/content/product-matrix.ts'`

- [ ] **Step 3: 实现数据模块**

`src/content/product-matrix.ts`：导出上面 Interfaces 里的全部类型与常量，导出方式全部 `export const` / `export type`（`verbatimModuleSyntax` 已开，类型必须 `export type`）。格子文案按下表逐字写入：

| no | key | label | summary | saas | service | devices |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `equilibrium` | 平衡与位形 | 磁平衡计算：位形、剖面与稳定性底图 | ● 平衡求解器，云端即用 | ● 托卡马克平衡场 · FRC 形成与平衡 | 托卡马克 · FRC |
| 02 | `mhd` | 磁流体稳定性 | MHD 稳定性判定与非线性演化 | ● MHD 求解器，稳定性与演化 | ● 鱼骨模等不稳定性演化 | 托卡马克 · FRC 磁压缩 |
| 03 | `transport` | 输运 | 能量与粒子输运剖面 | ● 输运求解器，剖面输出 | ● 输运剖面对比与实验验证 | 托卡马克 |
| 04 | `energetic` | 高能粒子 | 高能粒子轨道与它驱动的模 | ○ 按需评估 | ● 香蕉轨道追踪 · 鱼骨模驱动 | 托卡马克 |
| 05 | `heating` | 加热与电流驱动 | 加热、电流驱动与功率沉积 | ○ 按需评估 | ● 加热效果验证 | 托卡马克 |
| 06 | `density` | 密度极限 | 密度极限预测与运行窗口 | ○ 按需评估 | ● 密度极限预测 | 托卡马克 · EAST |
| 07 | `wall` | 器壁与热负荷 | PWI、热负荷与材料响应 | ○ 按需评估 | ● PWI 与热负荷沉积 | 托卡马克 |
| 08 | `disruption` | 破裂与缓解 | 破裂演化、晕电流与缓解手段 | ○ 按需评估 | ● VDE 晕电流 · MGI 缓解 | 托卡马克 |

- 上表 `saas` / `service` 两列开头的 `●` / `○` **只表示 `state`**（`●` → `delivered`，`○` → `scoped`），不是文案的一部分。`MatrixCell.text` 从第一个汉字开始，符号由 `StateDot` 按 `state` 渲染，不进文本层，避免读屏重复播报。
- `solvers` 的 5 条：`平衡` / `磁流体` / `输运` / `粒子与中性束` / `壁面与器壁相互作用`，`text` 各一句能力描述（每句不超过 20 字，形如「位形与剖面」「稳定性与非线性演化」）。
- `compute = { label: '国产异构算力', value: '2.0×', text: '典型算例最高加速；与华为合作平台实测优于 Intel 200%' }`
- `evidence` 四条：`中科院等离子体所 / 仿真-实验关键指标一致`、`华为 / 国产聚变程序与国产算力首次适配`、`星能玄光 / FRC 磁压缩模拟，实验成本降 60%`、`新奥能源研究院 / 氢硼研究基金立项`。
- `coverage` 用 `processes.length` 等派生，**不要**写字面量 8 / 5 / 4。
- `legend = [{ state: 'delivered', label: '已交付案例' }, { state: 'scoped', label: '按需评估' }, { state: 'planned', label: '规划中' }]`

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test webpack-plugins/product-matrix.test.ts`
Expected: PASS，6 tests

- [ ] **Step 5: 提交**

```bash
git add src/content/product-matrix.ts webpack-plugins/product-matrix.test.ts
git commit -m "feat(products): 覆盖矩阵数据模块与不变量测试"
```

---

### Task 2: 页面与样式

**Files:**
- Create: `src/styles/matrix.ts`
- Modify: `src/pages/ProductsPage.tsx`（整体重写，保留 `ProductCard` 以外的全部旧导入清理）
- Modify: `src/lib/meta.ts:32-35`（`/products/` 的 description）

**Interfaces:**
- Consumes: Task 1 的 `processes` / `solvers` / `compute` / `evidence` / `coverage` / `legend` 与全部类型
- Produces（`src/styles/matrix.ts`，供页面直接使用）：
  - `MatrixHead`（列头行，窄容器隐藏）
  - `MatrixList`（`<ul>` 容器，宽容器时 `display: grid; grid-template-columns: 200px minmax(0,1fr) minmax(0,1fr) 150px`）
  - `MatrixRow`（`<li>`，窄容器折成条目；props `$delay?: number`）
  - `ProcessCell`（`<div>`：`no` + `h3.label` + `p.summary`）
  - `DeliveryCell`（`<div>`；props `$state: DeliveryState`）
  - `CellLabel`（格内列名，宽容器 `display: none`，窄容器显示）
  - `StateDot`（props `$state: DeliveryState`，`aria-hidden` 的 8px 圆点）
  - `DeviceTags`（`<div>`，装置证据标签）
  - `Legend`（`<ul>`，图例行）
  - `SolverStrip` / `SolverCell`（5 个等宽编号格）
  - `ComputeRow`（算力带，与 `SolverStrip` 同一条 hairline 体系）
  - `EvidenceGrid` / `EvidenceItem`（4 条合作验证）
  - `ExitBand`（出口段落容器）

- [ ] **Step 1: 写样式文件 `src/styles/matrix.ts`**

每条硬性要求逐条落实（这是本页的版式契约）：

- 首列 `200px` 固定（宽容器），两个交付列 `minmax(0, 1fr)`，装置列 `150px`——保证「加热与电流驱动」换行时不挤歪列宽。
- 行分隔只用 `border-top: 1px solid var(--line)`，`MatrixList` 的 `:first-child` 去掉上边框；`MatrixHead` 用 `var(--line-strong)` 且 `font-family: var(--font-mono)`、`letter-spacing: 0.22em`、`text-transform: uppercase`、`font-size: 0.72rem`、`color: var(--text-muted)`。
- `ProcessCell` 的 `no` 用 `font-family: var(--font-mono)` + `color: var(--accent-ink)`；`h3` 用 `font-size: 1.15rem; font-weight: 600`；`p`（summary）用 `color: var(--text-muted); font-size: 0.92rem; line-height: 1.7`。
- `StateDot`：`width/height: 8px; border-radius: 999px; flex: none;`。`delivered` → `background: var(--accent)`；`scoped` → `background: transparent; border: 1.5px solid var(--accent)`；`planned` → `background: transparent; border: 1.5px dashed var(--line-strong)`。
- `SolverStrip`：`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));`，格子之间 `border-left: 1px solid var(--line)`，整条 `border-top` + `border-bottom: 1px solid var(--line)`。
- 全部变形只用 `fromContainer(containers.shell, ...)`；**不出现 `@media (max-width...)`**。
- 入场动画只用 `reveal`（`src/styles/animation.ts`），`$delay` 取 0–3。

- [ ] **Step 2: 重写 `src/pages/ProductsPage.tsx`**

六段，顺序固定：

1. `<PageHeader title="产品矩阵" description="8 类物理过程 · 5 类求解器 · 2 类装置，标准产品与定制方案两条交付路径。" />`
2. 概览带：`coverage` 的四个数字，`<dl>` 结构（`dt` 等宽小字、`dd` 大字），数据全部来自 `coverage`。
3. 覆盖矩阵：`<h2>覆盖矩阵</h2>` + 一句导语 + `Legend` + `MatrixHead` + `MatrixList`，每行 `MatrixRow` 含 `ProcessCell` + 两个 `DeliveryCell`（各自带 `CellLabel`）+ `DeviceTags`。
4. 支撑层：`<h2>矩阵的地基</h2>` + `SolverStrip`（`solvers`）+ `ComputeRow`（`compute`）。
5. 装置与证据：两张证卡——托卡马克 → `/products/service_tokamak/`、场反位形 FRC → `/products/service_frc/`，标题/描述从 `contentPageByUrl` 取 `frontmatter`（单一来源，不复制文案）；其下 `EvidenceGrid` 渲染 `evidence`。
6. 出口：`<h2>没列到的，可以按需评估</h2>` + `<BtnLink href="/contact/" $variant="primary">预约合作</BtnLink>` + `<BtnAnchor href="https://docs.fusim.cn/" $variant="light">访问产品文档</BtnAnchor>`。

约束：
- 行序即 `processes` 数组顺序，不做运行时排序。
- 每行 `h3` 是过程名（`label`），`summary` 与两个格子都是它的兄弟节点，保证 `h3` 只包裹标题。
- 不再 `import { productSections, productsOfSection }`；不再使用 `Section` / `CardGrid` / `CardLink` / `CardAnchor` / `Reveal`。
- `contentPageByUrl` 查不到 `service_tokamak` / `service_frc` 时直接抛错（`if (!a || !b) throw new Error(...)`），不要静默渲染空卡——路由改名时构建期就该炸。

- [ ] **Step 3: 改 SEO 描述**

`src/lib/meta.ts` 里 `/products/` 的 `description` 现在写的是「覆盖算力供给、平台管理与行业智能」，与实际内容无关。改为：
`覆盖 8 类聚变物理过程、2 类装置的仿真能力，标准产品与定制方案两条交付路径。`

- [ ] **Step 4: 类型与 Lint**

Run: `npx tsc -b && npm run lint`
Expected: 两条命令均无输出错误（biome 报格式问题则 `npm run format` 后再跑）

- [ ] **Step 5: 构建并在预渲染产物里验证内容真的落地**

Run: `npm run build`
Expected: 构建成功（含 `prerender.mjs`）

Run: `grep -c '加热与电流驱动' dist/products/index.html; grep -c '工程仿真方案' dist/products/index.html`
Expected: 两个数字均 `>= 1`——说明矩阵在无 JS 的预渲染 HTML 里就完整存在（Review Focus 3）

- [ ] **Step 6: 截图核对亮色宽屏**

```bash
node scripts/preview.mjs &
~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell \
  --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,2600 --screenshot=/tmp/matrix-light.png \
  --virtual-time-budget=4000 "http://127.0.0.1:4173/products/"
```

打开 `/tmp/matrix-light.png` 逐条核对：矩阵列头与 8 行对齐成表；「加热与电流驱动」没有把列宽挤歪；状态点与文案同排；页尾有出口段落而不是半屏空白。

- [ ] **Step 7: 提交**

```bash
git add src/styles/matrix.ts src/pages/ProductsPage.tsx src/lib/meta.ts
git commit -m "feat(products): 产品矩阵页改为覆盖矩阵版式"
```

---

### Task 3: 内容清理与全站验收

**Files:**
- Delete: `src/content/products/more.mdx`、`src/content/products/more_service.mdx`
- Delete: `src/content/products/sections/saas.mdx`、`src/content/products/sections/service.mdx`
- Modify: `src/lib/content.ts`（删 `productSections` 导出、`product_section` 类型成员与 `toKind` 分支、`Frontmatter.section_key`）
- Modify: `src/ssr.tsx:36-43`（删 `product_section` 过滤与其注释）
- Modify: `src/content/site.ts`（删 `matrix` 字段）

**Interfaces:**
- Consumes: 无
- Produces: `products` / `productsOfSection` 行为不变（`product_section` 作为 frontmatter 字段保留，首页仍按它分组）

- [ ] **Step 1: 删除占位内容与空目录页**

```bash
git rm src/content/products/more.mdx src/content/products/more_service.mdx \
       src/content/products/sections/saas.mdx src/content/products/sections/service.mdx
```

- [ ] **Step 2: 清掉随之失效的代码**

`src/lib/content.ts`：`ContentKind` 去掉 `'product_section'`；`toKind` 删掉 `products/sections/` 分支；删掉 `productSections` 导出；`Frontmatter` 删掉 `section_key`（`product_section` 保留）。`src/ssr.tsx` 的 `routes` 直接摊开 `contentPageByUrl.values()`，删掉过滤逻辑与那句注释。`src/content/site.ts` 删掉 `matrix` 数组。

- [ ] **Step 3: 类型与测试**

Run: `npx tsc -b && npm test`
Expected: 全部通过（`noUnusedLocals` 会抓出漏删的导入）

- [ ] **Step 4: 重建并确认空页已从 sitemap 消失**

Run: `npm run build`
Run: `grep -c 'products/more' dist/sitemap.xml || true`
Expected: `0`（`grep` 无匹配时退出码 1，所以用 `|| true`）

Run: `ls dist/products/`
Expected: 只剩 `cbaldur  index.html  service_frc  service_tokamak`，没有 `more` / `more_service`

- [ ] **Step 5: 截图核对暗色 + 窄屏 + 首页回归**

```bash
~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell \
  --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,2600 --screenshot=/tmp/matrix-dark.png \
  --virtual-time-budget=4000 "http://127.0.0.1:4173/products/?theme=dark"
```

```bash
~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell \
  --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=375,3400 --screenshot=/tmp/matrix-375.png \
  --virtual-time-budget=4000 "http://127.0.0.1:4173/products/"
```

```bash
~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell \
  --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,2600 --screenshot=/tmp/home-after.png \
  --virtual-time-budget=4000 "http://127.0.0.1:4173/"
```

逐条核对：
- `/tmp/matrix-dark.png`：状态点在 `#06070a` 上可辨；行分隔线可见（Review Focus 2）。
- `/tmp/matrix-375.png`：每个交付格上方出现列名「标准产品 · CBaldur」「工程仿真方案」；无横向滚动条；`h3` 不换行成两行单字（Review Focus 1、5）。
- `/tmp/home-after.png`：首页产品区块只剩托卡马克 / 场反位形两张卡，网格不塌（Review Focus 4）。

- [ ] **Step 6: 全门禁**

Run: `npx tsc -b && npm run lint && npm test && npm run build`
Expected: 四条全绿。把四条命令的实际输出贴进提交说明或 PR 描述。

- [ ] **Step 7: 提交**

```bash
git add -A src/content src/lib src/ssr.tsx
git commit -m "chore(products): 删除产品占位页与失效的 product_section 分支"
```

---

## 自检记录

- **spec 覆盖**：结构 1–6 段 → Task 2 Step 2；删除项 1–3 → Task 3；事实核对 → Global Constraints 与 Task 1 Step 3；数据落点 → Task 1；样式落点 → Task 2 Step 1。spec 的「我的决定」四条 → Global Constraints 与 Task 2 Step 1。
- **未覆盖项**：spec 里「点开真产品页看内容是否与矩阵口径一致」不在本次范围（`service_*.mdx` 正文不动）。
- **类型一致性**：`DeliveryState` / `MatrixCell` / `MatrixProcess` 在 Task 1 定义，Task 2 的 `DeliveryCell.$state` 与 `StateDot.$state` 都取 `DeliveryState`。
