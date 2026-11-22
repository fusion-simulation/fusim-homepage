# E2E 遗留问题全量修复 设计稿

日期：2026-11-03
来源：上一轮 E2E 测试报告（22 路由 × 6 视口 × 亮/暗主题，Firefox 140 + `scripts/preview.mjs`）

## 意图

把 E2E 发现的 10 类缺陷一次修完，并把「标题层级」这类**只能靠人工看**的规则变成构建产物上的自动断言，避免下轮回归。

## 目标

1. 移动端点击导航项后菜单收起（当前停留展开态覆盖新页面）。
2. 当前页导航项带 `aria-current="page"`。
3. 每页恰好一个 `h1`；标题层级不跳级；页脚栏目名不再是标题；正文里的 `#####`（h5）回到 h2。
4. 覆盖矩阵的交付状态对读屏可见（`●/○` 不是唯一载体）。
5. 320px 视口无横向滚动。
6. 客户端 404 不写不存在的 canonical，并带 `noindex`。
7. 正文图 `sizes` 与真实槽位一致（Firefox 不再因 `sizes="auto, 100vw"` 整体回落 100vw 而下载 2–3 倍体积的图）。
8. `target="_blank"` 的外链一律带 `noopener noreferrer`；附件大小不在单位中间折行。
9. 站内链接走 wouter（页脚、页头 CTA、社会报导卡），不再整页刷新。
10. 以上规则由 `npm run check:dist` 在 `dist/` 上断言。

## 非目标

- 不改配色、字号、间距、版式（标题层级调整必须做到**视觉零变化**，必要时把原来的元素选择器改成组件选择器）。
- 不引入 Playwright/Puppeteer 等 E2E 框架；`check:dist` 只解析 HTML 文本。
- 不修 `frontmatter.wide` 死字段（`content.ts` 已注明「渲染不再读取」，本轮不动内容模型）。
- 不处理附件里 8 个按 README 约定不入库的大数据文件（部署事项）。
- 不为「页脚内链」补 hover 焦点测试等既有缺口。

## 反目标（即使做完也算失败）

- 为了消灭跳级，把卡片标题都改成 h2，页面大纲变成一片同级。
- `sizes` 改成 `100vw` 之外的固定值而让窄屏拿到过小的图。
- 视觉上出现任何可见变化（字号、颜色、行高、留白）。

## 约束

- 只用 `index.html` 已定义的令牌；不新增色值、keyframes、视口媒体查询。
- 组件不得出现 `window` / `matchMedia` / `document` 分支：SSR 与 CSR 输出必须逐字一致（`sizes`、`aria-current`、状态文案都由纯函数决定）。
- `npm test` 使用 `node --test webpack-plugins/*.test.ts`（Node 24 原生 TS 剥离）。测试只能 import 不依赖 webpack 的模块（`import.meta.webpackContext`、`virtual:*` 在 Node 里不可用）。
- 门禁：`npx tsc -b`、`npm run lint`、`npm test`、`npm run build`、`npm run check:dist`。

## 三个决策（已与人类伙伴确认）

### A. 标题模型

**决策**：全站统一 `h1`（页头）→ `h2`（区块）→ `h3`（条目）。页脚三个栏目名改为非标题元素。

**取舍**：
- 「只补隐藏 h2 糊住跳级」改动最小，但读屏大纲里会出现没有视觉对应的空标题，等于用假数据骗过检查器 —— 弃。
- 「每页重排版式」收益不足，且违反「视觉零变化」 —— 弃。
- 选中方案：按语义重新分配元素，样式跟组件走（`PressCard`、`PubTitle` 等把 `& h4` 选择器改成对应元素选择器），视觉不变。

### B. 图片 `sizes`

**决策**：`sizes="(min-width: 1000px) min(阅读列, 图片上限)px, 86vw"`，由 `imageSizes(intrinsicWidth, slotWidth = 860)` 生成。

**取舍**：
- 保留 `sizes="auto, 100vw"`：`auto` 只能单独出现，写成列表会让整条声明失效回落 `100vw`；实测 720px 槽位下载 1280w base（354 KB）—— 弃。
- 运行时测量槽位再写 `sizes`：破坏 SSR/CSR 一致，还得处理 resize —— 弃。
- 选中方案：`ProseArticle` 宽度是 `min(100% - 14vw, 860px)`，与槽位严格对应；`860/0.86 = 1000px` 是阅读列到顶的视口宽度。

### C. 回归门禁

**决策**：新增 `scripts/check-dist.mjs` + `npm run check:dist`，解析 `dist/**/index.html` 与 `404.html` 做静态断言。

**取舍**：
- 只靠手工 E2E：本轮的问题正是「构建成功但页面不对」，必须有可重跑的闸门 —— 弃。
- 引入 Playwright：依赖体积与 CI 成本远超需求 —— 弃。

## 由我决定的实现细节

- `isActivePath(location, href)` 抽到 `src/lib/nav.ts`：按路径边界匹配（`/products-extra/` 不算 `/products/` 激活），可单测。
- 矩阵状态文案：`cellAccessibilityText(cell)` 在 `cell.text` 已等于状态名（「按需评估」格）时返回空串，避免读屏重复。
- `metaTagPlan(input)` 放 `src/lib/meta-policy.ts`（不 import webpack 模块），返回 `{ canonical: string | null, robots: 'noindex' | null }`。
- `SrOnly` 视觉隐藏组件放 `src/styles/shared.ts`。
- 页脚栏目名改用 `FooterColTitle = styled.span`，原 `& h4` 样式整块搬过去。
- `PressCard` 拆 `PressCardLink`（wouter `Link`）/`PressCardAnchor`（外链），共用 `pressCardCss`。

## 留给计划

任务拆分、每个任务先失败后通过的测试、精确文件与行号、提交粒度。
