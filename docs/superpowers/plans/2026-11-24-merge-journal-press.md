# 合并企业动态与社会报导 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/journal/`（11 篇）与 `/press/`（3 篇）合并成一个挂在 `/press/`、标题为「企业动态」的时间轴列表，每篇文章带可检索的 tags。

**Architecture:** 内容目录收敛为 `src/content/press/` 一处，列表由目录直接生成（删掉 `site.ts` 里手工维护的 `reports` 清单）。标签是 frontmatter 字段，筛选逻辑是 `src/lib/tags.ts` 里的纯函数（可被 `node --test` 直接跑），页面只负责把 query 与按钮状态接到它们上。

**Tech Stack:** React 19 + wouter 3 + styled-components 6 + MDX（remark-mdx-frontmatter）、webpack 构建期预渲染、biome、`node --test`。

**Spec:** `docs/superpowers/specs/2026-11-24-merge-journal-press-design.md`

## Global Constraints

- 标签词表固定 6 个，每篇 1–2 个：`科研进展` / `会议交流` / `荣誉奖项` / `融资合作` / `媒体报道` / `技术洞察`。
- 列表按 `frontmatter.date` 倒序（与现有 `journalPages` 一致：`(b.date ?? '').localeCompare(a.date ?? '')`）。
- 不引入新色值，全部用 `src/styles` 里已有的 token（`--accent` / `--accent-rgb` / `--line` / `--bg-card` / `--text-muted` 等）。
- 预渲染在 Node 里跑，`src/ssr.tsx` 的 `Router hook` 只注入 pathname；渲染期**不得**读 `window` / `location` / `useSearch()`。
- 旧 `/journal/**` 地址直接 404（方案 C），不生成跳转页。
- 提交信息用中文，前缀沿用仓库习惯（`feat` / `refactor` / `test` / `docs`）。
- 每个任务收尾：`npm run test` 与 `npm run lint` 必须绿；只有最后一个任务要求 `npm run build` + `npm run check:dist`。

## Review Focus

规格里隐含、但单个任务的测试不一定能兜住、且真会伤到使用者的几处，逐条在对应任务里钉死：

- **无 JS 的预渲染页必须仍是全量 14 篇**（`/press/` 的 HTML 里 14 张卡片都在）——筛选只能发生在客户端 state，否则爬虫与 RSS 读者看到空列表。→ Task 3 Step 9。
- **标签按钮不能嵌在 `<a>` 里**（HTML 非法，`check:dist` 不查，浏览器行为不可预期）——卡片用 `<article>` + 标题内链接，参照 `PublicationsPage` 的 `PubCard` 做法。→ Task 3 Step 5。
- **14 篇一篇都不能少**：删掉 `site.ts` 的 `reports` 手工清单正是为了根治漏条目，列表数量必须等于 `press/` 目录文件数。→ Task 3 Step 9。
- **导航收敛成一项后 `aria-current` 恰好 1 处**，`/press/` 本级为 `page`、`/press/<slug>/` 为 `true`。→ Task 4 Step 3（`check:dist`）。
- **`?tag=` 未知值不得让页面空白成 bug**：未知标签 → 空列表 + 空态文案，而不是崩或静默显示全量。→ Task 1 Step 3、Task 3 Step 5。

---

### Task 1: 标签纯函数

**Files:**
- Create: `src/lib/tags.ts`
- Test: `webpack-plugins/tags.test.ts`

**Interfaces:**
- Consumes: 无（不 import `src/lib/content.ts`，用结构化泛型避免把 webpack 虚拟模块拖进 `node --test`）。
- Produces:
  - `type Tagged = { frontmatter: { tags?: readonly string[] } }`
  - `type TagCount = { tag: string; count: number }`
  - `collectTags<T extends Tagged>(pages: readonly T[]): TagCount[]` — 按 `count` 降序，同数保持首次出现顺序；无 tags 的页面不产生条目。
  - `filterByTag<T extends Tagged>(pages: readonly T[], tag: string | null): T[]` — `tag` 为 `null` / `''` 时返回全量；未知标签返回 `[]`。
  - `parseTag(search: string): string | null` — 读 `?tag=`，缺失或空值返回 `null`。

- [ ] **Step 1: 写失败的测试 `webpack-plugins/tags.test.ts`**

夹具用最小结构字面量，顶部先给一个造夹具的小函数（`T` 推不出来就写 `as const` 后 `as Tagged[]`）：

```ts
const tagged = (groups: string[][]) => groups.map((tags) => ({ frontmatter: { tags } }))
```

断言：

```ts
test('collectTags：按篇数降序，同数保持首次出现顺序', () => {
  const pages = tagged([['科研进展'], ['会议交流', '科研进展'], ['会议交流']])
  assert.deepEqual(collectTags(pages), [
    { tag: '科研进展', count: 2 },
    { tag: '会议交流', count: 2 },
  ])
})

test('collectTags：无 tags 的页面不产生条目', () => {
  assert.deepEqual(collectTags(tagged([[], ['媒体报道']])), [{ tag: '媒体报道', count: 1 }])
})

test('filterByTag：null 与空串返回全量', () => {
  const pages = tagged([['科研进展'], []])
  assert.equal(filterByTag(pages, null).length, 2)
  assert.equal(filterByTag(pages, '').length, 2)
})

test('filterByTag：未知标签返回空列表', () => {
  assert.deepEqual(filterByTag(tagged([['科研进展']]), '不存在的标签'), [])
})

test('parseTag：读 query，缺失与空值都是 null', () => {
  assert.equal(parseTag('?tag=%E7%A7%91%E7%A0%94%E8%BF%9B%E5%B1%95'), '科研进展')
  assert.equal(parseTag(''), null)
  assert.equal(parseTag('?tag='), null)
  assert.equal(parseTag('?theme=dark'), null)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test`
Expected: FAIL，`Cannot find module '../src/lib/tags.ts'`（其余既有测试仍 PASS）。

- [ ] **Step 3: 实现 `src/lib/tags.ts`**

三个导出按 Interfaces 的签名实现。`collectTags` 用 `Map` 计数后 `[...map].sort((a, b) => b.count - a.count)`（V8 的 `sort` 稳定，同数即首次出现序）；`parseTag` 用 `new URLSearchParams(search).get('tag')`，把空串归一成 `null`。文件顶部注释说明「为什么是纯函数、为什么不 import content.ts」——与 `src/lib/nav.ts` 同一动机。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm run test`
Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/tags.ts webpack-plugins/tags.test.ts
git commit -m "feat(tags): 新增标签计数与筛选纯函数"
```

---

### Task 2: 列表页样式

**Files:**
- Modify: `src/styles/hub.ts`（在「报道：发丝时间轴」小节内新增；**只增不删**，`JournalFeature` / `FeatureLabel` / `PressCardLink` / `PressCardAnchor` 留到 Task 3 删掉最后一个引用时再删）

**Interfaces:**
- Consumes: `hub.ts` 已有的 `reveal`、`corners`、`RevealProps`、`reducedMotion`。
- Produces（Task 3 按这些名字 import）：
  - `TagBar` — `styled.div`，`role="group"` 的容器，flex wrap，行内 gap 10px。
  - `TagButton` — `styled.button<{ $active?: boolean }>`，等宽小标签外形；`$active` 时实线 accent 边框 + `rgba(var(--accent-rgb), 0.14)` 底；非 active 用 `var(--line)` 边框 + `--text-muted` 文字；带 `:focus-visible` 轮廓。
  - `TagCount` — `styled.span`，计数用，比标签本体淡一档。
  - `TagRow` — `styled.div`，卡片内标签行，flex wrap，gap 8px。
  - `NewsCard` — `styled.article<RevealProps>`，复用现有 `pressCardCss` 的盒模型（角框、`translateX(4px)` hover、`--bg-card`），内部 `h2` 沿用 press 卡片字号，`h2 a` 走 `--text` / hover `--accent-ink`；`p` 为 `--text-muted` 摘要。

- [ ] **Step 1: 在 `hub.ts` 新增上述五个 styled 组件**

放在 `PressSource` / `PressHint` 之后、空态小节之前，注释说明这是「企业动态合并列表」的标签行与卡片。`TagButton` 必须是 `<button>`（可键盘操作、能带 `aria-pressed`），不要做成 `<a>`。

- [ ] **Step 2: 类型检查通过**

Run: `npx tsc -b`
Expected: 无输出（未使用的导出不算错）。

- [ ] **Step 3: 提交**

```bash
git add src/styles/hub.ts
git commit -m "feat(styles): 企业动态列表的标签行与卡片样式"
```

---

### Task 3: 合并列表（内容搬迁 + 页面重写 + 接线）

**Files:**
- Move: `src/content/journal/*.mdx` → `src/content/press/`（11 个文件，`git mv`）
- Modify: 全部 14 个 `src/content/press/*.mdx`（加 `tags`）
- Modify: `src/lib/content.ts`、`src/content/site.ts`、`src/pages/PressPage.tsx`、`src/pages/MdxPage.tsx`、`src/pages/HomePage.tsx`、`src/App.tsx`、`src/components/Header.tsx`、`src/components/Footer.tsx`、`src/lib/meta.ts`
- Delete: `src/pages/JournalPage.tsx`
- Modify: `src/styles/hub.ts`（删 `JournalFeature`、`FeatureLabel`、`PressCardLink`、`PressCardAnchor`）

**Interfaces:**
- Consumes: Task 1 的 `collectTags` / `filterByTag` / `parseTag`；Task 2 的 `TagBar` / `TagButton` / `TagCount` / `TagRow` / `NewsCard`。
- Produces:
  - `ContentKind = 'page' | 'product' | 'press'`；`articleKinds = ['press']`
  - `Frontmatter.tags?: string[]`
  - `newsPages: ContentPage[]`（原 `journalPages`，按 date 倒序，kind 为 `press`）

- [ ] **Step 1: 搬迁内容目录**

```bash
git mv src/content/journal/*.mdx src/content/press/
rmdir src/content/journal
```

正文里的图片引用无需改动——已核实 11 篇引用的都是 `/assets/press/<slug>/`，`public/assets/` 下没有 `journal/`。

- [ ] **Step 2: 给 14 篇 frontmatter 补 `tags`（内联 YAML 数组）**

| 文件 | tags |
| --- | --- |
| `wechat-aapps-dpp-2026` | `[会议交流]` |
| `wechat-aie-density-limit` | `[科研进展, 媒体报道]` |
| `wechat-challenge-cup-2026` | `[荣誉奖项]` |
| `wechat-guanggu-qingmiao` | `[融资合作]` |
| `wechat-huawei-ascend` | `[融资合作, 技术洞察]` |
| `wechat-hydrogen-boron-fund` | `[科研进展, 融资合作]` |
| `wechat-iaea-world-fusion-outlook-2026` | `[科研进展]` |
| `wechat-nfec-2026` | `[会议交流]` |
| `wechat-plasma-brake` | `[技术洞察, 科研进展]` |
| `wechat-ppcf-disruption-prediction` | `[科研进展, 技术洞察]` |
| `wechat-wuhan-cup-spark-seed-fund` | `[荣誉奖项, 融资合作]` |
| `wechat-ehl-density` | `[科研进展, 媒体报道]` |
| `wechat-fusion-software-breakthrough` | `[媒体报道]` |
| `wechat-liu-jiaxing-award` | `[荣誉奖项]` |

- [ ] **Step 3: `src/lib/content.ts` 收敛 kind**

`ContentKind` 去掉 `'journal'`；`articleKinds` 改 `['press']`；`toKind` 删 journal 分支；`Frontmatter` 加 `tags?: string[]`（注释：列表页标签筛选用）；`journalPages` 改名 `newsPages` 并 `filter(page.kind === 'press')`。同步改第 76 行注释里的 `journal` 字样。

- [ ] **Step 4: 删 `src/content/site.ts` 的 `reports` 数组**

列表改由目录生成，这份手工清单是过去 press 漏条目的根因。确认 `site.reports` 再无引用（`grep -rn "reports" src`）。

- [ ] **Step 5: 重写 `src/pages/PressPage.tsx`**

结构：`PageHeader`（title「企业动态」，description 沿用 journal 那句「记录产品演进、技术洞察、行业观点与团队故事。」）→ `Section id="press"` → 标签栏 → `Timeline` → `EmptyPanel` 兜底。

筛选状态（**渲染期不得读 `location`**，Node 预渲染会 ReferenceError）：

```tsx
const [tag, setTag] = useState<string | null>(null)

// 地址栏只在客户端存在：预渲染 HTML 与首帧都是全量，挂载后再恢复 ?tag= 筛选
useEffect(() => setTag(parseTag(window.location.search)), [])

const select = (next: string | null) => {
  setTag(next)
  const query = next ? `?tag=${encodeURIComponent(next)}` : ''
  window.history.replaceState(null, '', `/press/${query}`)
}
```

- 标签栏：`<TagBar role="group" aria-label="按标签筛选">`，首个「全部」按钮 `aria-pressed={tag === null}`、计数为 `newsPages.length`，其后 `collectTags(newsPages).map(...)`，每个按钮 `aria-pressed={tag === item.tag}`，`<TagCount>{item.count}</TagCount>`。
- 列表：`filterByTag(newsPages, tag).map(...)`，每项 `<TimelineEntry>` 里依次是 `<DateMono>{date}</DateMono>`、`<NewsCard>`、卡片内 `<TagRow>` 的 `TagButton`（点击 = `select(tag)`，`aria-pressed` 同上）。
- `NewsCard` 内部：`<h2><Link href={post.url}>{title}</Link></h2>` + `description` 段落 + `TagRow` + `<PostFoot>`（有 `external_url` 时渲染 `<a target="_blank" rel="noopener noreferrer">微信公众号原文</a>`，否则 `<span />`；右侧 `<ReadMore>阅读 →</ReadMore>`）。**卡片是 `<article>`，不是 `<a>`**——标签按钮嵌在链接里是非法 HTML。
- 筛选后为空：`EmptyPanel` 文案「没有「{tag}」标签的动态」+ 一个「查看全部」按钮（`select(null)`）。

- [ ] **Step 6: `src/styles/hub.ts` 删掉失去引用的样式**

`JournalFeature`、`FeatureLabel`（精选卡随 journal 列表一起消失）、`PressCardLink`、`PressCardAnchor`（合并后列表项全是站内文章，外链入口移到卡片 foot 的「原文」）。`pressCardCss` 保留（`NewsCard` 在用）。**必须在 Step 5 之后**，否则中间态会有未使用/缺失引用。

- [ ] **Step 7: 详情页（`src/pages/MdxPage.tsx`）展示 tags**

`HeaderFooter` 里在日期与原文之后补一行标签（仅 `kind === 'press'` 且 `frontmatter.tags?.length` 时）：每个 tag 渲染 `<Link href={`/press/?tag=${encodeURIComponent(tag)}`}>`，点一下回到列表并筛上该标签。样式用 Task 2 的 `TagRow`，链接外形沿用 `PubTag` 的角框语汇。**不用 `<button>`**：详情页到列表是路由跳转，`<a>` 才能右键开新窗口、也才能无 JS 可用。

- [ ] **Step 8: 删 `JournalPage.tsx`，接掉所有引用**

```bash
git rm src/pages/JournalPage.tsx
```

- `src/App.tsx`：删 `JournalPage` import 与 `<Route path="/journal" …>`；第 18 行注释里的「企业动态」措辞保持。
- `src/components/Header.tsx`：`NAV_ITEMS` 删掉 `{ href: '/journal/', label: '企业动态' }`，把 `{ href: '/press/', label: '社会报导' }` 改成 `{ href: '/press/', label: '企业动态' }`；第 125 行注释里的 `/journal/xxx/` 换成 `/press/xxx/`。
- `src/components/Footer.tsx`：`SiteLinks` 同样收敛成一项「企业动态」→ `/press/`。
- `src/lib/meta.ts`：删 `'/journal/'` 条目；`'/press/'` 的 title 改 `'企业动态 | 聚核智算 FUSIM'`，description 改「聚核智算企业动态：科研进展、会议交流、荣誉奖项与媒体报道。」
- `src/pages/HomePage.tsx`：import 改 `newsPages`，第 459 行 `newsPages.slice(0, 3)`，第 475 行按钮 `href="/press/"`。

- [ ] **Step 9: 构建验证（本任务要求产物正确）**

Run: `npm run build`
Expected: 预渲染 24 页（合并前 `find dist -name index.html | wc -l` 是 25，`/journal/` 索引页消失后少 1），无报错。

预渲染产物是单行 HTML，计数一律用 `grep -o … | wc -l`（`grep -c` 数的是行数，只会得到 1）：

```bash
test ! -e dist/journal && echo "OK: dist/journal 已消失"
echo "卡片数：$(grep -o '<article' dist/press/index.html | wc -l)"        # 期望 14（全量，无 JS 也看得完整）
echo "sitemap press：$(grep -o '<loc>[^<]*</loc>' dist/sitemap.xml | grep -c '/press/')"  # 期望 15（列表 + 14 详情）
grep -o '/journal/' dist/sitemap.xml | wc -l                              # 期望 0
```

Run: `npm run test && npm run lint`
Expected: 全绿。

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat(content): 合并企业动态与社会报导为 /press/ 单列表"
```

---

### Task 4: 测试夹具与门禁同步

**Files:**
- Modify: `webpack-plugins/nav.test.ts`、`webpack-plugins/meta-policy.test.ts`、`webpack-plugins/prerender.test.ts`、`webpack-plugins/prerender.ts`、`src/lib/nav.ts`、`scripts/check-dist.mjs`

**Interfaces:**
- Consumes: Task 3 之后的站点结构（`/press/` 为唯一资讯栏目）。
- Produces: 无新接口，只让测试与注释说真话。

- [ ] **Step 1: 夹具里的 `/journal/...` 换成 `/press/...`**

`nav.test.ts`：`/journal/wechat-x/` → `/press/wechat-x/`；兄弟路径断言 `isActivePath('/journalism/', '/journal/')` 改成 `isActivePath('/press-archive/', '/press/')`（语义仍是「前缀相同但不该激活」）；`currentPageAttr` 三条同理。`meta-policy.test.ts` 的 `/journal/x/` → `/press/x/`。`prerender.test.ts` 的两处测试名与夹具（`journal 详情 JSON-LD…` → `press 详情 JSON-LD…`）。纯函数行为不变，所以测试应当**继续通过**——若失败说明 Task 3 改错了东西。

- [ ] **Step 2: 注释同步**

`webpack-plugins/prerender.ts:24`「journal 详情的 frontmatter.date」→「资讯详情的 frontmatter.date」；`src/lib/nav.ts:16,29` 的 `/journal/` 示例 → `/press/`；`scripts/check-dist.mjs:125`「详情页里的『企业动态』」措辞保持（现在仍成立）。

- [ ] **Step 3: 全量门禁**

```bash
npm run test && npm run lint && npm run build && npm run check:dist
```
Expected: `check:dist` 输出 `✓ 全部通过（N 页 · … ）`，其中 `/press/` 与每个 `/press/<slug>/` 的 `aria-current` 恰好 1 处（本级 `page`、详情 `true`）。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "test: 资讯栏目合并后同步测试夹具与注释"
```

---

### Task 5: 文档同步

**Files:**
- Modify: `README.md`、`.agents/skills/wechat-official-fetch/SKILL.md`、`.agents/skills/wechat-official-fetch/scripts/wechat-fetch.mjs`

**Interfaces:**
- Consumes: Task 3 的最终形态（目录、frontmatter 字段、`--section` 取值）。
- Produces: 无代码接口。

- [ ] **Step 1: `README.md`**

第 3 行栏目列表去掉「社会报导」；目录表删 `journal/*.mdx` 行、`press/*.mdx` 改为「企业动态列表 + 详情页」；frontmatter 字段表加 `tags`（作用：列表页标签筛选与卡片标签行）；「企业动态」小节的示例补 `tags` 并把路径改成 `src/content/press/`；第 153 行「页头 / 页脚 / 备案号 / 社会报导」去掉社会报导；第 208/212 行 SEO 小节里的 `journal` 字样改「资讯」。

- [ ] **Step 2: `.agents/skills/wechat-official-fetch/SKILL.md`**

分流表两行合成一行（全部进 `src/content/press/`）；`--section` 只剩 `press`（默认值也改）；删掉「要在 `site.ts` 的 `reports` 里加条目」整段，换成「frontmatter 必须写 `tags`，词表见 README」；description 里的 `press-vs-journal placement` 与「公司新闻」措辞同步。

- [ ] **Step 3: `wechat-fetch.mjs` 的 `--section` 取值**

`opts.section` 默认 `'press'`；校验改成 `['press']`（保留 flag 以免旧调用直接崩，报错文案说明只剩 press）；末尾提示第 3 条「`--section press` 要在 `site.ts` 的 `reports` 里加条目」改为「frontmatter 补 `tags`」。

- [ ] **Step 4: 验证 + 提交**

```bash
grep -rn "journal" README.md .agents/skills/wechat-official-fetch src webpack-plugins scripts   # 期望无输出
npm run test && npm run lint
git add -A
git commit -m "docs: 文档与公众号抓取 skill 同步合并后的企业动态栏目"
```
