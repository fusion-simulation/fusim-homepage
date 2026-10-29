# 构建期图片转 WebP（vite-plugins/webp.ts）

日期：2026-10-30

## 为什么做

站点 `public/assets/image/` 下有 5 个动图 GIF，合计 43.5 MB，直接参与首屏外的内容加载：

| 文件 | 尺寸 | 帧数 | 体积 | 动画 WebP (q75) |
| --- | --- | --- | --- | --- |
| banana.gif | 1000×800 | 200 | 6.4 MB | 1.28 MB |
| fisbone.gif | 771×651 | 48 | 8.0 MB | 0.85 MB |
| frc.gif | 1300×450 | 101 | 3.6 MB | 0.79 MB |
| psi_pres_con.gif | 640×480 | 130 | 12.4 MB | 2.62 MB |
| ppcfad02bcsupp2.gif | 2100×1000 | 40 | 12.0 MB | 12.85 MB |

平均压掉约 80%，且 WebP 动图在 Chrome 32+ / Firefox 65+ / Safari 14+ 全部支持。

## 目标

1. 构建时把 `public/` 下的 png / jpg / jpeg / gif 转成 WebP，产物里只发 WebP。
2. 源码里的引用自动改写（`/assets/image/x.gif` → `/assets/image/x.webp`），MDX 内容不用手改。
3. dev 与 build 行为一致：dev 访问 `<name>.webp` 时按需转换并缓存。
4. 二次构建不重复转码（磁盘缓存）。
5. 构建结束打印体积对照，方便发现回归。

## 非目标

- AVIF：实测 sharp/libheif 对动图的竖向堆叠高度上限是 16384px（36×450 通过，37×450 报 `image too large`），本项目 5 个 GIF 全部超限；静态图 AVIF 可行但按决定统一走 WebP。
- `<picture>` 兜底 / 多格式降级：直接替换（已确认）。
- 响应式多尺寸 `srcset`、文件名 hash、`public/` 内 CSS 的 `url()` 改写。
- 转换结果变大时的跳过逻辑：按决定无脑转换（`ppcfad02bcsupp2` 会 +7%）。

## 方案（已选 A）

- **A（选用）** Vite 插件 + sharp，路径原地换扩展名，`transform` 里做字面量替换。
- B 走 Vite 资源管线（`?webp` 导入）：要搬家 + 改 MDX 写法，改动面过大。
- C 独立 postbuild 脚本：dev 看不到效果，且依赖打包后 JS 形状。

## 实现要点

**文件**：`vite-plugins/webp.ts`，导出 `webpImages(options?)`；在 `vite.config.ts` 里加入 `plugins`。
**依赖**：`sharp` 作为 devDependency（只在 Node 侧用，动态 `import('sharp')`，缺失时给明确报错）。

### 扫描与转码
- 递归扫描 `config.publicDir`，取 `.png/.jpg/.jpeg/.gif`（大小写不敏感，跳过隐藏文件）。
- 用 `sharp(file).metadata()` 判断 `pages > 1` 即动图 → 管线加 `{ animated: true }`；统一 `.webp({ quality, effort })`。
- 默认 `quality: 75`、`effort: 4`，可通过插件参数覆盖。
- 目标路径 = 源路径换扩展名为 `.webp`；若 `public/` 里已有同名 `.webp`，警告并跳过该源文件（避免 `emitFile` 冲突）。

### 引用改写
- `transform`：对每个模块先做廉价的 `.png/.jpg/.jpeg/.gif` 子串判断，命中后把已登记源 URL（如 `/assets/image/frc.gif`）字面量替换为目标 URL。MDX 编译后仍是字符串字面量，因此对 MDX / TSX / CSS 一条规则通吃。
- `transformIndexHtml`：同样规则处理 `index.html`。

### build
- `buildStart`：并行（并发 4）转换全部候选，产物写入缓存目录；`this.emitFile({ type: 'asset', fileName: 相对 public 的路径, source })`。
- `closeBundle`：删除 `outDir` 里被替换的原图，打印对照表 `源 → 目标（−xx%）` 与总耗时。
- SSR 构建（`build:ssg` 的 `--ssr` 一遍，`copyPublicDir: false`）整体跳过。

### dev
- `configureServer` 注册中间件：请求路径命中转换表且 public 里不存在该文件时，取缓存或现场转换，返回 `image/webp`。
- watcher：源图 `change` / `unlink` 时删除对应缓存，下次请求重转；`add` 时重扫目录。

### 缓存
- 目录：`node_modules/.cache/fusim-webp/`，文件名 = `sha1(相对路径 + mtimeMs + size + quality + effort + 动/静)`，天然按内容失效。
- 过期文件不主动清理（记录为非目标）。

## 已定的取舍（“我的判断”，可反驳）

- 只在 `public/` 下工作，不改源码目录里的图片——项目里的图片都在 `public/assets/image/`，且 public 资源本来就不进 Vite 资源管线。
- 转换放在 `buildStart` 而不是打包完成后：这样改写阶段已知转换结果，且体积报告在构建中断前就能看到。
- dev 用按需转换而不是启动时预转：避免 dev 冷启动多等几秒。

## 验证方式

1. `npm run build`：`dist/assets/image/` 只有 5 个 `.webp`、无 `.gif`；`dist` 里的 JS 出现 `.webp`、不出现 `.gif`；终端打印对照表；总产物体积明显下降。
2. 二次 `npm run build`：转换耗时接近 0（缓存命中）。
3. `npm run dev` + 请求 `/assets/image/frc.webp`：200、`content-type: image/webp`；再请求走缓存。
4. `npm run build:ssg` 正常，未重复转码。
5. `npx tsc -b`、`npm run lint` 干净。
