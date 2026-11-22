# 图片管线前移（transform + 响应式变体）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run transform` 把动画图转成 WebP Q80（基图 + 响应式变体）并入库、静态图转成 AVIF Q80，同时改写内容引用与尺寸，然后删掉构建期转码管线。

**Architecture:** 纯函数层（`src/lib/image-transform.ts`）负责格式判定、变体宽度计划、路径映射、MDX 改写；`scripts/transform.mjs` 负责扫盘、调 sharp、写盘、删源。构建期不再碰 sharp。

**Tech Stack:** Node 24（原生运行 `.ts`）、sharp、`node --test`。

**Spec:** `docs/superpowers/specs/2026-11-04-image-transform-design.md`

## Global Constraints

- 动画图 → `webp({ quality: 80 })`；静态图 → `avif({ quality: 80, effort: 4 })`
- 变体宽度必须来自 `IMAGE_VARIANT_WIDTHS`（`src/lib/responsive-image.ts`），取 `< 基图宽度` 的值
- 基图宽度 = `min(displayWidth ?? intrinsicWidth, intrinsicWidth)`
- 只有真的缩放了某张图，才改写它的 `width`/`height`（新高度 = `Math.round(h * newW / oldW)`）
- `og-image.png`、`logos/fusim-logo-512.png`、`*.svg` 一律不碰
- 转换成功后删除源文件；转换失败必须保留源文件，且整体退出码非 0
- `src/lib/responsive-image.ts` **不做任何修改**

## Review Focus

- **`--dry-run`**：零写盘（含不改 MDX）
- **幂等**：连跑两次，第二次无写入
- **变体与 srcSet 一致**：磁盘上生成的变体集合必须等于 `responsiveImageAttributes()` 会拼出的候选集合
- **尺寸成对改写**：只改 `width` 漏改 `height` 会让宽高比错乱
- **不误伤**：`alt` 里出现 `banana.gif` 这类字样不能被替换；不同图片共用同一 `width` 值时不能串改
- **转换失败**：源文件保留、其余文件继续、退出码非 0

---

### Task 1: 纯函数层

**Files:**
- Create: `src/lib/image-transform.ts`
- Test: `webpack-plugins/image-transform.test.ts`

**Interfaces:**
- Consumes: `IMAGE_VARIANT_WIDTHS` from `../src/lib/responsive-image`
- Produces:
  - `decideFormat(pages: number | undefined): 'webp' | 'avif'`
  - `targetWidth(intrinsicWidth: number, displayWidth?: number): number`
  - `variantWidthsFor(baseWidth: number): readonly number[]`
  - `outputPathFor(sourceRel: string, format: 'webp' | 'avif'): string`
  - `variantPathFor(baseRel: string, width: number): string`
  - `rewriteMdx(text: string, rewrites: readonly ImageRewrite[]): string`
  - `type ImageRewrite = { fromUrl: string; toUrl: string; newWidth?: number; newHeight?: number }`

- [ ] **Step 1: 写失败的测试**

```ts
// webpack-plugins/image-transform.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decideFormat, outputPathFor, rewriteMdx, targetWidth, variantPathFor, variantWidthsFor,
} from '../src/lib/image-transform.ts'

test('decideFormat：多帧 webp，单帧与 undefined avif', () => {
  assert.equal(decideFormat(200), 'webp')
  assert.equal(decideFormat(2), 'webp')
  assert.equal(decideFormat(1), 'avif')
  assert.equal(decideFormat(undefined), 'avif')
})

test('targetWidth：展示宽度与固有宽度取小，缺省用固有宽度', () => {
  assert.equal(targetWidth(2100, 1200), 1200)
  assert.equal(targetWidth(1000, 1000), 1000)
  assert.equal(targetWidth(640), 640)
  assert.equal(targetWidth(771, 1200), 771)
})

test('variantWidthsFor：复用 IMAGE_VARIANT_WIDTHS 且严格小于基图宽度', () => {
  assert.deepEqual([...variantWidthsFor(1000)], [480, 800])
  assert.deepEqual([...variantWidthsFor(1200)], [480, 800])
  assert.deepEqual([...variantWidthsFor(771)], [480])
  assert.deepEqual([...variantWidthsFor(640)], [480])
  assert.deepEqual([...variantWidthsFor(320)], [])
})

test('outputPathFor / variantPathFor：只动扩展名', () => {
  assert.equal(outputPathFor('assets/image/banana.gif', 'webp'), 'assets/image/banana.webp')
  assert.equal(outputPathFor('assets/press/x/01.JPG', 'avif'), 'assets/press/x/01.avif')
  assert.equal(variantPathFor('assets/image/banana.webp', 480), 'assets/image/banana-480.webp')
})

test('rewriteMdx：替换 src 并成对改写 width/height', () => {
  const mdx = [
    '<ResponsiveImage',
    '  src="/assets/image/frc.gif"',
    '  alt="场反位形"',
    '  width={1300}',
    '  height={450}',
    '  displayWidth={1200}',
    '/>',
  ].join('\n')
  const out = rewriteMdx(mdx, [
    { fromUrl: '/assets/image/frc.gif', toUrl: '/assets/image/frc.webp', newWidth: 1200, newHeight: 415 },
  ])
  assert.match(out, /src="\/assets\/image\/frc\.webp"/)
  assert.match(out, /width=\{1200\}/)
  assert.match(out, /height=\{415\}/)
})

test('rewriteMdx：没缩放时不碰 width/height', () => {
  const mdx = '<ResponsiveImage src="/assets/image/banana.gif" width={1000} height={800} />'
  const out = rewriteMdx(mdx, [{ fromUrl: '/assets/image/banana.gif', toUrl: '/assets/image/banana.webp' }])
  assert.match(out, /width=\{1000\}/)
  assert.match(out, /height=\{800\}/)
})

test('rewriteMdx：不改 alt 里的同名字样', () => {
  const mdx = '<ResponsiveImage src="/assets/image/a.gif" alt="a.gif 说明" width={100} height={100} />'
  const out = rewriteMdx(mdx, [{ fromUrl: '/assets/image/a.gif', toUrl: '/assets/image/a.webp' }])
  assert.match(out, /alt="a\.gif 说明"/)
  assert.match(out, /src="\/assets\/image\/a\.webp"/)
})

test('rewriteMdx：共用同一 width 值的另一张图不被串改', () => {
  const mdx = [
    '<ResponsiveImage src="/assets/image/frc.gif" width={1300} height={450} />',
    '<ResponsiveImage src="/assets/image/other.png" width={1300} height={450} />',
  ].join('\n')
  const out = rewriteMdx(mdx, [
    { fromUrl: '/assets/image/frc.gif', toUrl: '/assets/image/frc.webp', newWidth: 1200, newHeight: 415 },
  ])
  assert.match(out, /frc\.webp" width=\{1200\} height=\{415\}/)
  assert.match(out, /other\.png" width=\{1300\} height=\{450\}/)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test webpack-plugins/image-transform.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/image-transform.ts'`

- [ ] **Step 3: 实现 `src/lib/image-transform.ts`**

`rewriteMdx` 用 `/<ResponsiveImage\b[^>]*?\/>/g` 逐块处理：块内含 `src="<fromUrl>"` 才动手，块内做三步替换（`src`、`width={旧}`、`height={旧}`）。逐块处理是"不串改共用宽度"和"不碰 alt"的关键；只在块内换 `width=`/`height=`，不要做全文替换。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test webpack-plugins/image-transform.test.ts`
Expected: PASS（8 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/lib/image-transform.ts webpack-plugins/image-transform.test.ts
git commit -m "feat(transform): 格式判定、变体计划与 MDX 改写纯函数"
```

---

### Task 2: `scripts/transform.mjs`

**Files:**
- Create: `scripts/transform.mjs`
- Test: `webpack-plugins/transform-cli.test.ts`
- Modify: `package.json`（加 `"transform": "node scripts/transform.mjs"`）

**Interfaces:**
- Consumes: Task 1 的全部导出
- Produces: `node scripts/transform.mjs [--root DIR] [--dry-run] [--force] [--keep-source]`

- [ ] **Step 1: 写失败的测试**

```ts
// webpack-plugins/transform-cli.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-transform-'))
  fs.mkdirSync(path.join(root, 'public/assets/image'), { recursive: true })
  fs.mkdirSync(path.join(root, 'src/content'), { recursive: true })
  return root
}

async function makeImages(root: string) {
  const w = 1000, h = 800
  const buffers: Buffer[] = []
  for (const c of ['#800', '#080', '#008']) {
    buffers.push(await sharp({ create: { width: w, height: h, channels: 3, background: c } }).gif().toBuffer())
  }
  await sharp(Buffer.concat(buffers), { animated: true })
    .gif().toFile(path.join(root, 'public/assets/image/anim.gif'))
  await sharp({ create: { width: 800, height: 600, channels: 3, background: '#888' } })
    .png().toFile(path.join(root, 'public/assets/image/still.png'))
}

const MDX = [
  '<ResponsiveImage src="/assets/image/anim.gif" alt="动画" width={1200} height={960} displayWidth={1000} />',
  '<ResponsiveImage src="/assets/image/still.png" alt="静态" width={800} height={600} displayWidth={700} />',
].join('\n')

test('基图 + 变体 + 静图 AVIF，源文件被删，引用与尺寸被改写', async () => {
  const root = fixture(); await makeImages(root)
  fs.writeFileSync(path.join(root, 'src/content/page.mdx'), MDX)
  execFileSync('node', ['scripts/transform.mjs', '--root', root], { cwd: process.cwd() })

  const dir = path.join(root, 'public/assets/image')
  assert.ok(fs.existsSync(path.join(dir, 'anim.webp')))
  assert.ok(fs.existsSync(path.join(dir, 'anim-480.webp')))
  assert.ok(fs.existsSync(path.join(dir, 'anim-800.webp')))
  assert.equal(fs.existsSync(path.join(dir, 'anim-1000.webp')), false, '基图不叫 -1000')
  assert.ok(fs.existsSync(path.join(dir, 'still.avif')))
  assert.equal(fs.existsSync(path.join(dir, 'anim.gif')), false)
  assert.equal(fs.existsSync(path.join(dir, 'still.png')), false)

  const mdx = fs.readFileSync(path.join(root, 'src/content/page.mdx'), 'utf8')
  assert.match(mdx, /src="\/assets\/image\/anim\.webp"/)
  assert.match(mdx, /width=\{1000\}/)
  assert.match(mdx, /height=\{800\}/)
  assert.match(mdx, /src="\/assets\/image\/still\.avif"/)
  assert.match(mdx, /width=\{800\}/, '静图不缩放，尺寸不动')
})

test('--dry-run 零写盘', async () => {
  const root = fixture(); await makeImages(root)
  const before = fs.readFileSync(path.join(root, 'public/assets/image/anim.gif'))
  execFileSync('node', ['scripts/transform.mjs', '--root', root, '--dry-run'], { cwd: process.cwd() })
  assert.equal(fs.existsSync(path.join(root, 'public/assets/image/anim.webp')), false)
  assert.deepEqual(fs.readFileSync(path.join(root, 'public/assets/image/anim.gif')), before)
})

test('幂等：连跑两次不报错', async () => {
  const root = fixture(); await makeImages(root)
  execFileSync('node', ['scripts/transform.mjs', '--root', root], { cwd: process.cwd() })
  execFileSync('node', ['scripts/transform.mjs', '--root', root], { cwd: process.cwd() })
  assert.ok(fs.existsSync(path.join(root, 'public/assets/image/anim.webp')))
})

test('转换失败：源保留、其余照常、退出码非 0', async () => {
  const root = fixture(); await makeImages(root)
  const broken = path.join(root, 'public/assets/image/broken.png')
  fs.writeFileSync(broken, 'not an image')
  let code = 0
  try {
    execFileSync('node', ['scripts/transform.mjs', '--root', root], { cwd: process.cwd() })
  } catch (e) { code = (e as { status?: number }).status ?? 1 }
  assert.notEqual(code, 0)
  assert.ok(fs.existsSync(broken))
  assert.ok(fs.existsSync(path.join(root, 'public/assets/image/anim.webp')))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test webpack-plugins/transform-cli.test.ts`
Expected: FAIL — 找不到 `scripts/transform.mjs`

- [ ] **Step 3: 实现 `scripts/transform.mjs`**

流程：解析参数 → 扫 `public/assets/image/` 与 `public/assets/press/`（`gif|png|jpg|jpeg`）→ 读 MDX 建 `Map<url, displayWidth>` → 每个文件：`sharp().metadata()` 取 `pages`/`width`/`height` → `decideFormat` → `targetWidth` 算基图宽度 → 写基图 → 若 webp 再按 `variantWidthsFor` 逐个写变体 → 成功后 `unlink` 源 → 汇总 `ImageRewrite[]` → 对 `src/**/*.{mdx,ts,tsx}` 调 `rewriteMdx` 写回 → 打印报告。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test webpack-plugins/transform-cli.test.ts`
Expected: PASS（4 个测试）

- [ ] **Step 5: 加 npm script 并提交**

```bash
git add scripts/transform.mjs webpack-plugins/transform-cli.test.ts package.json
git commit -m "feat(transform): 新增 npm run transform（动画 WebP+变体 / 静态 AVIF）"
```

---

### Task 3: 拆掉构建期转码

**Files:**
- Delete: `webpack-plugins/webp.ts`、`webpack-plugins/webp-loader.ts`、`webpack-plugins/webp.test.ts`
- Modify: `webpack.config.mjs`

**Interfaces:**
- Consumes: 无
- Produces: 构建期不引用任何转码代码；`src/lib/responsive-image.ts` 与此任务的删除范围无关，**不要动它**

- [ ] **Step 1: 删文件**

```bash
git rm webpack-plugins/webp.ts webpack-plugins/webp-loader.ts webpack-plugins/webp.test.ts
```

- [ ] **Step 2: 清理 `webpack.config.mjs`**

删除：`import { IMAGE_VARIANT_WIDTHS }`、`import { WebpPlugin }`、`export const PASSTHROUGH_IMAGE_URLS`、`createModuleRules` 里两处 `webp-loader.ts`、`const webp = new WebpPlugin({…})`、plugins 数组里的 `webp,`、devServer 的 `setupMiddlewares` 整段。

`mdx` 规则 → `use: [{ loader: plugin('mdx.ts') }]`；`\.[cm]?[jt]sx?` 规则 → `use` 只剩 babel-loader。

`HtmlWebpackPlugin.templateContent` → `() => fs.readFileSync(path.join(root, 'index.html'), 'utf8')`

- [ ] **Step 3: 验证**

Run: `npm test`
Expected: 全绿

Run: `grep -rn "webp-loader\|WebpPlugin\|PASSTHROUGH_IMAGE_URLS" webpack.config.mjs src/ scripts/`
Expected: 无输出

Run: `git diff --stat src/lib/responsive-image.ts`
Expected: 无输出（该文件未被修改）

- [ ] **Step 4: 构建仍能通过（此时图片还没转，源 GIF 仍在）**

Run: `npm run build`
Expected: 成功。注意此时页面上的图会 404（URL 还是 `.gif` 且插件已删），属预期——Task 4 会修好

- [ ] **Step 5: 提交**

```bash
git add webpack.config.mjs
git commit -m "refactor: 删除构建期 WebP 转码，改由 npm run transform 前置完成"
```

---

### Task 4: 执行 transform 并验证

**Files:**
- Modify: `public/assets/image/*`、`public/assets/press/**`
- Modify: `src/content/products/*.mdx`、`src/content/{press,journal}/*.mdx`

**Interfaces:**
- Consumes: Task 2 的 CLI
- Produces: `public/` 只剩上线的 `.webp`/`.avif`

- [ ] **Step 1: 备份原始素材**

```bash
mkdir -p ~/fusim-image-originals
cp -a public/assets/image/*.gif ~/fusim-image-originals/
ls ~/fusim-image-originals/ | wc -l   # 期望 5
```

- [ ] **Step 2: dry-run 核对清单**

Run: `npm run transform -- --dry-run`
Expected: 5 个 gif→webp（含变体）、press 图→avif，零写盘

- [ ] **Step 3: 正式执行**

Run: `npm run transform`

- [ ] **Step 4: 核对产物与体积**

Run: `find public/assets/image -type f | sort`
Expected: **13 个 `.webp`** = 5 个基图 + 8 个变体（banana 2、fisbone 1、frc 2、ppcfad02bcsupp2 2、psi_pres_con 1）

Run: `du -sh public/assets/image && du -sh public/assets/press`
Expected: 约 20 MB 与约 1 MB

- [ ] **Step 5: 变体与 srcSet 一致性**

Run: `npm run build && grep -o 'srcSet="[^"]*"' dist/products/service_tokamak/index.html`
Expected: 每个 `srcSet` 里的文件名都真实存在于 `dist/assets/image/`（人工比对 + `npm run check:dist`）

- [ ] **Step 6: 提交**

```bash
git add public/assets/image public/assets/press src/content
git commit -m "chore(assets): 图片转 WebP(含变体)/AVIF 并改写引用，移除 43MB 源 GIF"
```

---

### Task 5: 文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README**

「常用命令」加：`npm run transform  # 动画图→WebP Q80(含响应式变体)、静态图→AVIF Q80，并改写引用`。
「构建管线」删掉 WebP 转码描述，改成一句：图片在**入库前**已转换并生成变体，构建期不再转码，`sharp` 不参与构建。
补两条约定：`og-image.png` 与 `logos/fusim-logo-512.png` 必须保持 PNG；`*.svg` 不参与转换。

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: 说明 npm run transform 与图片格式/变体约定"
```

---

## 收尾检查

- [ ] `npm test` 全绿
- [ ] `npm run build && npm run check:dist` 通过
- [ ] `npm run dev` 里产品页 5 张图、press 配图都能显示
- [ ] `public/` 下无 `.gif`；除 `og-image.png`/`fusim-logo-512.png` 外无 `.png`
- [ ] `grep -c sharp webpack.config.mjs` → 0
