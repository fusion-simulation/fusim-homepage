# 合并企业动态与社会报导（`/journal/` + `/press/` → `/press/`）

日期：2026-11-24

## 意图与为什么

站点现在有两个同源却分开的资讯栏目：`/journal/`（企业动态，11 篇）与 `/press/`（社会报导，3 篇）。
两边都是「公众号文章搬进 MDX + 详情页」，区别只在放哪个目录、以及列表页用哪套版式。
对用户来说这是同一类内容，分两栏反而要各点一次才看得全；导航里「企业动态」「社会报导」并列也显得重复。

合并后：一个列表页，标题「企业动态」，挂在 `/press/`，用 press 的发丝时间轴版式；
每篇文章带 tags，可以按 tag 检索。

## 目标

- 14 篇文章（11 journal + 3 press）出现在同一个列表里，按 `date` 倒序。
- 列表页标题为「企业动态」，版式沿用 press 的时间轴（`Timeline` / `TimelineEntry` / 卡片）。
- 每篇文章 frontmatter 有 `tags`，列表页可按 tag 筛选，筛选结果可通过 URL 分享。
- 详情页（`MdxPage`）现有行为不变（页头标题 + 简介 + 日期 + 公众号原文链接），**只多一行可点 tags**，
  点 tag 回列表并筛上该标签（`/press/?tag=…`，用 `<a>` 而非 `<button>`，无 JS 也能用）。
- 导航与页脚只剩一个入口「企业动态」→ `/press/`。

## 非目标

- 不做分类页/标签归档页（`/tags/xxx/` 这类独立路由）。
- 不改详情页正文排版、不改图片链路。
- 不动论文发表（`/publications/`）与产品矩阵。

## 反目标

- 不希望以后加一篇文章还要判断「这算 journal 还是 press」——目录必须收敛成一个。
- 不希望无 JS 的预渲染页面因为筛选而少显示文章。

## 约束

- 部署是 `rsync --delete dist/`（纯静态，无 rewrite），所以旧地址的表现完全由产物决定。
- 预渲染走 `src/ssr.tsx` 的 `routes`，`Router hook` 只注入 pathname、没有 search hook。
  已核实：wouter 的 `useSearch()` 最终调 `useSyncExternalStore(subscribe, () => location.search, …)`，
  `ssrSearch` 缺省时服务端快照也是同一个读 `location` 的函数（`node_modules/wouter/src/use-browser-location.js:24-37`），
  在 Node 里直接抛 ReferenceError。所以列表页**不能**在渲染期读 query，只能 state + `useEffect`。
- `webpack-plugins/*.test.ts` 用 `node --test` 跑，纯函数要放在不依赖 webpack 虚拟模块的文件里。

## 全量引用清单（已 grep 核实）

删掉 `journal` 这一类要一起改的地方，漏一处就是坏链接或死代码：

| 位置 | 处理 |
| --- | --- |
| `src/App.tsx:10,39` | 删 `JournalPage` import 与 `/journal` 路由 |
| `src/pages/JournalPage.tsx` | 整个文件删除 |
| `src/lib/content.ts:18,21,69,76,97` | 去 `'journal'` kind、`articleKinds`、`toKind` 分支、`journalPages` 改名 |
| `src/lib/meta.ts:26` | 删 `/journal/` 条目 |
| `src/components/Header.tsx:75,125` / `Footer.tsx:21` | 导航项收敛为「企业动态」→ `/press/`，注释同步 |
| `src/pages/HomePage.tsx:5,459,475` | 改 `newsPages`、按钮指向 `/press/` |
| `src/lib/nav.ts:16,29`、`webpack-plugins/prerender.ts:24` | 注释里的 `/journal/` 示例换成 `/press/` |
| `webpack-plugins/nav.test.ts:9,14,26-28`、`meta-policy.test.ts:38-42`、`prerender.test.ts:66-108` | 测试夹具里的 `/journal/...` 换成 `/press/...`（纯函数行为不变，但夹具该说真话） |
| `src/content/site.ts:15` `reports` | 删除（仅 `PressPage` 用过） |
| `README.md`、`.agents/skills/wechat-official-fetch/` | 文档同步 |

已核实的两件事：

- **图片无需改动**：11 篇 journal 正文引用的都是 `/assets/press/<slug>/`，
  `public/assets/` 下根本没有 `journal/` 目录（`wechat-huawei-ascend.mdx` 只有视频，无图）。
- **`check:dist` 仍会通过**：它按「导航项路径是否拥有本页」推期望的 `aria-current`，
  合并后 `/press/` 与 `/press/<slug>/` 各命中 1 项，不会出现双高亮或缺高亮。

## 方案（已选）

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| A 目录不动，只并列表 | journal 文件留在原处，列表读两个目录 | URL 前缀永久分裂，加文章仍要选目录 |
| B 全搬 press + 旧地址生成跳转页 | 11 篇搬进 `press/`，构建期为每个旧 `/journal/<slug>/` 生成 meta refresh 页 | 改动最大，多一步构建产物 |
| **C 全搬 press，旧地址 404**（已选） | 11 篇搬进 `press/`，`/journal/` 路由与页面全部删除 | 最干净；已外发的 11 个旧链接会断 |

选 C 的理由：目录、URL、心智模型一次对齐，之后只有一处放文章。

## 怎么建（已定的部分）

### 内容

- `src/content/journal/*.mdx` → `git mv` 到 `src/content/press/`。图片已在
  `public/assets/press/<slug>/`，正文引用无需改动。
- `src/content/site.ts` 的 `reports` 数组删除：列表改为直接读 `press/` 目录，
  不再需要第二份手工维护的清单（这是过去 press 漏条目的根因）。

### 标签词表（我的判断，每篇 1–2 个）

`科研进展` / `会议交流` / `荣誉奖项` / `融资合作` / `媒体报道` / `技术洞察`

- 科研进展：aie-density-limit、iaea-world-fusion-outlook-2026、ppcf-disruption-prediction、
  plasma-brake、hydrogen-boron-fund、ehl-density
- 会议交流：aapps-dpp-2026、nfec-2026
- 荣誉奖项：liu-jiaxing-award、challenge-cup-2026、wuhan-cup-spark-seed-fund
- 融资合作：guanggu-qingmiao、huawei-ascend、hydrogen-boron-fund、wuhan-cup-spark-seed-fund
- 媒体报道：fusion-software-breakthrough、ehl-density、aie-density-limit
- 技术洞察：plasma-brake、ppcf-disruption-prediction、huawei-ascend

### 代码

- `src/lib/content.ts`：`ContentKind` 去掉 `'journal'`（只剩 `page | product | press`）；
  `Frontmatter` 增 `tags?: string[]`；`journalPages` 改名 `newsPages`（仍按 date 倒序）。
- `src/lib/tags.ts`（新）：纯函数 `collectTags(pages)`（tag → 篇数，按篇数降序）、
  `filterByTag(pages, tag)`、`parseTag(search)`。放独立文件才能被 `node --test` 直接 import。
- `webpack-plugins/tags.test.ts`（新）：覆盖计数排序、空 tag 返回全量、未知 tag 返回空、
  `parseTag('?tag=…')` 与无 query。
- `src/pages/PressPage.tsx`：改写为合并列表（时间轴 + 标签筛选行），`JournalPage.tsx` 删除。
- `src/pages/MdxPage.tsx`：资讯详情页页头补一行 tags（`<Link>` 到 `/press/?tag=…`）。
- `src/styles/hub.ts`：新增标签行/标签按钮样式；删除随精选卡一起消失的
  `JournalFeature` / `FeatureLabel`（`PostGrid`/`PostCard` 首页仍在用，保留）。
- `src/App.tsx`：删 `/journal` 路由；`Header.tsx` / `Footer.tsx` 导航项收敛为一个「企业动态」→ `/press/`。
- `src/lib/meta.ts`：删 `/journal/` 条目，`/press/` 的 title 改「企业动态 | 聚核智算 FUSIM」。
- `src/pages/HomePage.tsx`：「最新动态」取 `newsPages.slice(0, 3)`，按钮指向 `/press/`。

### 筛选交互（我的判断）

- 列表页顶部一排标签按钮：「全部」+ 各 tag（带篇数），当前选中态高亮。
- 单一数据源是组件 state，初值 `null`（= 全部）。挂载后 `useEffect` 读
  `window.location.search` 的 `tag`，点击标签时同步 `history.replaceState` 改写地址栏。
  这样预渲染 HTML 与首帧客户端渲染完全一致（都是全量），不会有 hydration 不一致，
  无 JS 的爬虫看到的仍是全部文章；而 `/press/?tag=会议交流` 可以直接转发。
- 卡片内展示该篇全部 tags，点击 tag 即筛选（与顶部按钮同一套逻辑）。

### 文档

- `README.md`：目录表、frontmatter 字段表（新增 `tags`）、企业动态小节、去掉社会报导表述。
- `.agents/skills/wechat-official-fetch/SKILL.md`：`--section` 只剩 `press`，
  不再往 `site.ts` 的 `reports` 加条目，改为要求 frontmatter 写 `tags`。

## 留给实现者决定的

- 标签按钮的具体视觉（沿用 `PubTag` 的角框语汇还是新做一套），以现有 token 为准，不引入新色值。
- `parseTag` 对非法/未知 tag 的处理：按「无筛选」还是「空列表」，测试里锁死即可。

## 验证

- `npm run test`（含新增 tags 测试）、`npm run lint`、`npm run build`、`npm run check:dist` 全绿。
- `dist/` 里不再有 `journal/`，`sitemap.xml` 只列 `/press/` 与 `/press/<slug>/`。
- 浏览器：`/press/` 显示 14 篇；点 tag 数量正确；`/press/?tag=媒体报道` 刷新后仍是筛选态；
  详情页的 tag 能点回筛选后的列表；旧 `/journal/wechat-plasma-brake/` 返回 404 页。
