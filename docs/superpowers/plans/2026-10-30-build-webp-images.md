# 构建期图片转 WebP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `vite-plugins/webp.ts`，在 build 时把 `public/` 下的 png/jpg/jpeg/gif 转成 WebP、改写引用、删掉 dist 里的原图；dev 时按需转换。

**Architecture:** 单个 Vite 插件 + sharp。扫描/改写/转码三块拆成纯函数（可单测），插件只做接线：`transform` 改写字面量、`buildStart` 并发转码进缓存、`closeBundle` 拷进 outDir 并删原图、`configureServer` 中间件按需转码。

**Tech Stack:** Vite 8 插件 API、sharp（libvips）、Node 24 内置 `node --test`（原生跑 .ts，无需 vitest）。

**Spec:** `docs/superpowers/specs/2026-10-30-build-webp-images-design.md`

## Global Constraints

- 格式只做 WebP（AVIF 已弃用），动图用 `sharp(src, { animated: true })`。
- 默认 `quality: 75`、`effort: 4`，可通过 `webpImages({ quality, effort })` 覆盖。
- 无脑转换：结果变大也照转，不做「变大就跳过」。
- 只处理 `public/` 下的 png / jpg / jpeg / gif（大小写不敏感），其它文件一律忽略。
- 引用改写只针对 `public/` 里真实存在的文件，保留 query / hash 后缀。
- 缓存目录默认 `<root>/node_modules/.cache/fusim-webp/`。
- SSR 构建（`config.build.ssr` 为真，即 `build:ssg` 的第二遍）整体跳过。
- 代码风格跟随仓库：2 空格、无分号、单引号、`import ... from './x.ts'` 带扩展名、中文注释；`tsc -b`（`noUnusedParameters` / `erasableSyntaxOnly`）与 `oxlint` 必须干净。
- 实现顺序 TDD：每个任务先写失败的测试并确认它失败，再写实现。

## Review Focus

1. **转码失败（坏图 / sharp 未安装）**：构建要给出带文件路径的可读错误，且原图留在 dist 里，不能半途删文件。
2. **同名不同扩展名**（`a.png` + `a.gif`）与 **public 里已有 `a.webp`**：不能产生重复目标文件，必须警告并跳过。
3. **带 query/hash 的引用**（`/assets/image/x.gif?v=1`）：改写后后缀要保住，不能被截断。
4. **动图**：转完必须还是多帧（`pages` 不变），不能被压成首帧。
5. **大小写扩展名**（`A.PNG`）：仍要识别，目标扩展名统一小写 `.webp`。

---

### Task 1: 扫描 + 引用改写（纯函数）

**Files:**
- Create: `vite-plugins/webp.ts`
- Test: `vite-plugins/webp.test.ts`
- Modify: `package.json`（加 `"test": "node --test vite-plugins/*.test.ts"`）

**Interfaces:**
- Produces:
  - `export const SOURCE_EXTENSIONS: readonly string[]`（`['.png','.jpg','.jpeg','.gif']`）
  - `export type ImageEntry = { sourceRel: string; sourceAbs: string; targetRel: string; targetAbs: string; sourceUrl: string; targetUrl: string }`
  - `export type SkippedImage = { sourceRel: string; reason: 'duplicate-target' | 'target-exists' }`
  - `export function collectImageEntries(publicDir: string): { entries: ImageEntry[]; skipped: SkippedImage[] }`
  - `export function rewriteReferences(code: string, entries: ImageEntry[]): string | null`（无变化返回 `null`）
  - `rel` 用 posix 分隔符且不带前导 `/`（`assets/image/frc.gif`），`url` 带前导 `/`。

- [ ] **Step 1: 写失败的测试**

```ts
// vite-plugins/webp.test.ts
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { collectImageEntries, rewriteReferences } from './webp.ts'

const dirs: string[] = []
function makePublicDir(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusim-webp-'))
  dirs.push(dir)
  for (const rel of files) {
    const abs = path.join(dir, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, '')
  }
  return dir
}
after(() => { for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true }) })

test('收集大小写不敏感的图片并换小写 .webp 扩展名', () => {
  const dir = makePublicDir(['assets/img/A.PNG', 'assets/img/b.JPG', 'assets/img/c.jpeg', 'assets/img/d.gif', 'favicon.svg', 'assets/other/e.webp', '.hidden/f.png'])
  const { entries } = collectImageEntries(dir)
  assert.deepEqual(entries.map((e) => e.targetRel).sort(), ['assets/img/A.webp', 'assets/img/b.webp', 'assets/img/c.webp', 'assets/img/d.webp'])
  assert.equal(entries[0].sourceUrl.startsWith('/assets/img/'), true)
  assert.equal(entries.find((e) => e.sourceRel === 'assets/img/A.PNG')?.targetAbs, path.join(dir, 'assets/img/A.webp'))
})

test('同名不同扩展名只保留一个，并记录 duplicate-target', () => {
  const dir = makePublicDir(['x/a.gif', 'x/a.png'])
  const { entries, skipped } = collectImageEntries(dir)
  assert.equal(entries.length, 1)
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.png', reason: 'duplicate-target' }])
})

test('public 里已有的 .webp 使同源图片被跳过', () => {
  const dir = makePublicDir(['x/a.png', 'x/a.webp'])
  const { entries, skipped } = collectImageEntries(dir)
  assert.deepEqual(entries, [])
  assert.deepEqual(skipped, [{ sourceRel: 'x/a.png', reason: 'target-exists' }])
})

test('改写引用且保留 query 与 hash', () => {
  const dir = makePublicDir(['img/a.gif'])
  const { entries } = collectImageEntries(dir)
  const code = 'src="/img/a.gif" x=url(/img/a.gif?v=1) y="/img/a.gif#t" z="/img/b.gif"'
  assert.equal(rewriteReferences(code, entries), 'src="/img/a.webp" x=url(/img/a.webp?v=1) y="/img/a.webp#t" z="/img/b.gif"')
})

test('没有可改写内容时返回 null', () => {
  const { entries } = collectImageEntries(makePublicDir(['img/a.gif']))
  assert.equal(rewriteReferences('const a = 1', entries), null)
  assert.equal(rewriteReferences('', []), null)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL —— `Cannot find module './webp.ts'`

- [ ] **Step 3: 实现 `collectImageEntries` 与 `rewriteReferences`**

`collectImageEntries`：递归 `readdirSync(..., { withFileTypes: true })`，跳过以 `.` 开头的目录/文件，按名字排序保证确定性；扩展名用小写比较命中 `SOURCE_EXTENSIONS`；目标是同路径把扩展名换为 `.webp`。维护已占用的 `targetRel` 集合：`public/` 里本身就存在的 `.webp` 先加入集合（对应源记为 `target-exists`），已生成的记 `duplicate-target`。`rewriteReferences`：先做 `code` 里是否含任意源扩展名的廉价判断，然后对每个 entry 用带文件名边界负向断言的正则 `new RegExp(escapeRegExp(entry.sourceUrl) + '(?![A-Za-z0-9._-])', 'g')` 全局替换（边界断言保证 `/img/a.gif.png`、`photo.png.webp` 这类前缀不被误改，同时 `?v=1`、`#t`、引号、`)` 照常命中），最后比较结果，无变化返回 `null`。

- [ ] **Step 4: 跑测试确认通过，并跑类型/风格检查**

Run: `npm test && npx tsc -b && npm run lint`
Expected: 全部通过

- [ ] **Step 5: 提交**

```bash
git add vite-plugins/webp.ts vite-plugins/webp.test.ts package.json
git commit -m "feat: 图片扫描与引用改写纯函数（构建期 WebP 第一步）"
```

---

### Task 2: sharp 转码 + 磁盘缓存

**Files:**
- Modify: `vite-plugins/webp.ts`
- Test: `vite-plugins/webp.test.ts`
- Modify: `package.json` / `package-lock.json`（`npm i -D sharp`）

**Interfaces:**
- Consumes: `ImageEntry`（Task 1）
- Produces:
  - `export type EncodeOptions = { quality: number; effort: number }`
  - `export async function encodeWebp(sourceAbs: string, options: EncodeOptions): Promise<Buffer>`（`metadata().pages > 1` 时走 `{ animated: true }`）
  - `export function cachePathFor(cacheDir: string, entry: ImageEntry, stats: { mtimeMs: number; size: number }, options: EncodeOptions): string`
  - `export async function ensureWebp(entry: ImageEntry, cacheDir: string, options: EncodeOptions): Promise<{ data: Buffer; cached: boolean }>`

- [ ] **Step 1: 装依赖并写失败的测试**

```bash
npm i -D sharp
```

```ts
// 追加到 vite-plugins/webp.test.ts
import sharp from 'sharp'
import { cachePathFor, encodeWebp, ensureWebp } from './webp.ts'

async function writeGif(abs: string, frames: number) {
  const images = await Promise.all(Array.from({ length: frames }, (_, i) =>
    sharp({ create: { width: 64, height: 48, channels: 3, background: { r: i * 40, g: 80, b: 160 } } }).png().toBuffer()))
  const gif = await sharp(images, { join: { animated: true } }).gif().toBuffer()
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, gif)
}

test('动图转完仍是多帧', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'anim.gif')
  await writeGif(abs, 3)
  const out = await encodeWebp(abs, { quality: 75, effort: 4 })
  const meta = await sharp(out, { animated: true }).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.pages, 3)
})

test('静图转成单帧 webp', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'still.png')
  await sharp({ create: { width: 32, height: 32, channels: 3, background: '#123456' } }).png().toFile(abs)
  const out = await encodeWebp(abs, { quality: 75, effort: 4 })
  const meta = await sharp(out).metadata()
  assert.equal(meta.format, 'webp')
  assert.equal(meta.pages ?? 1, 1)
})

test('坏图报错带文件路径', async () => {
  const dir = makePublicDir(['bad.png'])  // 空文件
  await assert.rejects(() => encodeWebp(path.join(dir, 'bad.png'), { quality: 75, effort: 4 }), (err: Error) => err.message.includes('bad.png'))
})

test('缓存键随 mtime / 质量变化，命中后不重复编码', async () => {
  const dir = makePublicDir([])
  const abs = path.join(dir, 'c.png')
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#fff' } }).png().toFile(abs)
  const { entries } = collectImageEntries(dir)
  const cacheDir = path.join(dir, 'cache')
  const options = { quality: 75, effort: 4 }
  const first = await ensureWebp(entries[0], cacheDir, options)
  const second = await ensureWebp(entries[0], cacheDir, options)
  assert.equal(first.cached, false)
  assert.equal(second.cached, true)
  const stats = fs.statSync(abs)
  const other = cachePathFor(cacheDir, entries[0], stats, { quality: 90, effort: 4 })
  assert.notEqual(cachePathFor(cacheDir, entries[0], stats, options), other)
  assert.notEqual(cachePathFor(cacheDir, entries[0], { ...stats, mtimeMs: stats.mtimeMs + 1000 }, options), cachePathFor(cacheDir, entries[0], stats, options))
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL —— `encodeWebp is not a function` / 模块未导出

- [ ] **Step 3: 实现三个函数**

`encodeWebp`：`sharp(sourceAbs).metadata()` 判断 `pages`，动图用 `sharp(sourceAbs, { animated: true })`，然后 `.webp({ quality, effort }).toBuffer()`；`catch` 里重抛 `new Error(\`[fusim:webp] 转码失败 ${sourceAbs}：${message}\`)`。`cachePathFor`：`sha1(\`${sourceRel}|${mtimeMs}|${size}|q${quality}e${effort}\`) + '.webp'`，落在 `cacheDir` 下。`ensureWebp`：`statSync` → 算缓存路径 → 命中则 `readFileSync` 返回 `{ data, cached: true }`，否则编码后 `mkdirSync(cacheDir, { recursive: true })` + `writeFileSync`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test && npx tsc -b && npm run lint`
Expected: 全部通过

- [ ] **Step 5: 提交**

```bash
git add vite-plugins/webp.ts vite-plugins/webp.test.ts package.json package-lock.json
git commit -m "feat: sharp 转码 WebP 与磁盘缓存"
```

---

### Task 3: 插件接线 + build 路径

**Files:**
- Modify: `vite-plugins/webp.ts`
- Modify: `vite-plugins/webp.test.ts`
- Modify: `vite.config.ts`（`plugins` 里加 `webpImages()`）

**Interfaces:**
- Consumes: Task 1 / Task 2 的全部导出
- Produces: `export type WebpOptions = { quality?: number; effort?: number; cacheDir?: string }`、`export function webpImages(options?: WebpOptions): Plugin`

**实现约定（与 spec 的差异，已与需求方确认方向）：** 转好的文件在 `closeBundle` 里直接拷进 `outDir`，不用 `this.emitFile`——这些是 `public/` 静态资源，不参与打包图，直接落盘少一层 bundler 依赖，且能保证「先删原图再报告」的顺序。

- `configResolved(config)`：记下 `root`、`publicDir`、`config.command`、`config.build.outDir`、`Boolean(config.build.ssr)`、`cacheDir = options.cacheDir ?? path.join(root, 'node_modules/.cache/fusim-webp')`。
- 扫描时机：`buildStart`（build）与 `configureServer`（dev）各调一次 `refresh()`（`collectImageEntries` + `console.warn` 输出 `skipped`）。
- 状态：`entries`（扫描结果，永不删）；`converted: { entry: ImageEntry; cachePath: string; sourceBytes: number; outputBytes: number }[]`（成功项）；`failed: Set<string>`（失败项的 `sourceRel`）。
- `transform(code)`：改写集合 = `command === 'build' ? entries.filter((e) => !failed.has(e.sourceRel)) : entries`；`entries` 为空或 `rewriteReferences` 返回 `null` 时返回 `null`。
- `transformIndexHtml(html)`：同上改写集合，`rewriteReferences(...) ?? undefined`。
- `buildStart()`：非 build 或 SSR 直接 return；按 4 个一批并发 `ensureWebp`，成功的进 `converted` 并记 `sourceBytes` / `outputBytes`，失败的 `console.warn` 并加入 `failed`（构建继续，原图保留）。
- `closeBundle()`：非 build 或 SSR 直接 return；对每个 `converted` 项 `mkdirSync(dirname(out))` + `copyFileSync(cachePath, out)`；若 `out/<sourceRel>` 存在则 `unlinkSync`；最后打印 `[fusim:webp] N 张 · X MB → Y MB（-Z%）· Ts` 与逐行明细。

- [ ] **Step 1: 写失败的测试（插件钩子层面，用假 context）**

```ts
async function writePng(abs: string) {
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  await sharp({ create: { width: 16, height: 16, channels: 3, background: '#abcdef' } }).png().toFile(abs)
}

function makePlugin(publicDir: string, command: 'build' | 'serve') {
  const plugin = webpImages()
  ;(plugin.configResolved as any)({ root: publicDir, publicDir, command, build: { outDir: path.join(publicDir, 'dist'), ssr: false } })
  return plugin
}

test('build 时 transform 改写已转换的引用', async () => {
  const dir = makePublicDir([])
  await writePng(path.join(dir, 'img/a.png'))
  const plugin = makePlugin(dir, 'build')
  await (plugin.buildStart as any).call({})
  assert.equal((plugin.transform as any).call({}, 'src="/img/a.png"', '/x.tsx'), 'src="/img/a.webp"')
  assert.equal((plugin.transform as any).call({}, 'const a = 1', '/x.tsx'), null)
})

test('转码失败的图片不参与 build 改写（原图保留）', async () => {
  const dir = makePublicDir(['img/broken.png'])  // 空文件
  const plugin = makePlugin(dir, 'build')
  const warnings: unknown[][] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => void warnings.push(args)
  try { await (plugin.buildStart as any).call({}) } finally { console.warn = origWarn }
  assert.equal((plugin.transform as any).call({}, 'src="/img/broken.png"', '/x.tsx'), null)
  assert.equal(warnings.length, 1)
})
```

（裁决：build 里转码失败的文件**不**改引用，dist 保留可用的原图；dev 里没有预转换，全部照改。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL —— `webpImages is not a function`

- [ ] **Step 3: 实现 `webpImages` 并注册到 `vite.config.ts`**

`vite.config.ts` 里：`import { webpImages } from './vite-plugins/webp.ts'`，`plugins: [mdx(), react(), griffel(), publications(), webpImages()]`。

- [ ] **Step 4: 真实构建验证**

Run: `npm run build`
Expected 终端出现 `[fusim:webp] 5 张 …` 明细；随后：

```bash
ls dist/assets/image/            # 只有 5 个 .webp，没有 .gif
grep -rl "frc.gif" dist | head   # 无输出
grep -rl "frc.webp" dist | head  # 命中 JS/HTML
```

- [ ] **Step 5: 二次构建走缓存**

Run: `npm run build`
Expected: 报告仍在，转换耗时接近 0（< 200ms）

- [ ] **Step 6: 提交**

```bash
git add vite-plugins/webp.ts vite-plugins/webp.test.ts vite.config.ts
git commit -m "feat: build 时把 public 图片转为 WebP 并改写引用"
```

---

### Task 4: dev 中间件

**Files:**
- Modify: `vite-plugins/webp.ts`

**Interfaces:**
- Consumes: `entries`、`ensureWebp`

- [ ] **Step 1: 实现 `configureServer`**

`configureServer(server)`：先 `refresh()`；`server.middlewares.use(async (req, res, next) => {...})`，用 `new URL(req.url ?? '/', 'http://localhost').pathname` 解码后查找 `entry.targetUrl`；未命中或 `entry.targetAbs` 已存在 → `next()`；否则 `ensureWebp` 后写 `Content-Type: image/webp`、`Content-Length`、`Cache-Control: no-cache`，`res.end(data)`；失败 → `500` 文本 `[fusim:webp] ...`。再挂 watcher：`server.watcher.on('all', (event, file) => { if ((event === 'add' || event === 'unlink') && file.startsWith(publicDir)) refresh() })`。

- [ ] **Step 2: 手动验证**

```bash
npm run dev &   # 或用已在跑的 dev server
sleep 3
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' http://localhost:5173/assets/image/frc.webp
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' http://localhost:5173/assets/image/frc.webp
```

Expected: 两次都 `200 image/webp ~800KB`；第一次耗时明显长于第二次（缓存命中）；`public/assets/image/frc.webp` 不应被创建。

- [ ] **Step 3: 提交**

```bash
git add vite-plugins/webp.ts
git commit -m "feat: dev 服务按需转码 WebP 并缓存"
```

---

### Task 5: 文档与端到端回归

**Files:**
- Modify: `README.md`
- Add（首次提交）: `docs/superpowers/specs/2026-10-30-build-webp-images-design.md`、本计划文件

- [ ] **Step 1: README 加一节**

在「实现说明」下加「图片转 WebP」：说明扫描范围、默认质量、缓存位置与手动清理方式、`/assets/image/x.gif` → `x.webp` 的引用改写规则、AVIF 不做及原因（libheif 动图堆叠高度 16384px 上限）、`build:ssg` 的第二遍不重复转码。

- [ ] **Step 2: 全量回归**

```bash
npm test && npx tsc -b && npm run lint
npm run build && npm run preview   # 首页 /products/service_tokamak 图片能显示
npm run build:ssg                  # 不重复转码，产物正常
```

Expected: 测试/类型/lint 全绿；页面 5 张动图正常播放；`build:ssg` 只报一次转换明细

- [ ] **Step 3: 提交**

```bash
git add README.md docs/superpowers
git commit -m "docs: 补充图片转 WebP 的构建说明"
```
