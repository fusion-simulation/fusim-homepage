# 图片管线前移：`npm run transform`（动画 WebP + 变体 / 静态 AVIF）

## 目标

把图片转换从**构建期**挪到**命令行**，产物连同响应式变体一起入库，构建期不再依赖 sharp。

现状：`public/assets/image/` 躺着 43 MB 源 GIF（入库），每次 `npm run build` 用 sharp 重新转出 38 MB WebP 到 `dist/`（不入库）。仓库背原始文件，构建每次都付转码成本。

## 决策

| 项 | 决定 |
| --- | --- |
| 动画图（`pages > 1`） | **WebP Q80**，基图缩到展示宽度，并生成响应式变体 |
| 静态图（单帧） | **AVIF Q80**，保持固有宽度，单文件无变体 |
| 变体宽度 | 复用 `IMAGE_VARIANT_WIDTHS`（`src/lib/responsive-image.ts`）中 `< 基图宽度` 的值 |
| 构建期 | 删除 `webpack-plugins/webp.ts`、`webp-loader.ts` 及 webpack 接线；sharp 退出构建 |
| 响应式逻辑 | **原样保留**（`src/lib/responsive-image.ts` 不动） |
| 源文件 | 转换成功后删除 |

## 为什么不"前置无损 + 后置变体"

实测发现抖动 GIF 降采样会摧毁可压缩性：

| 图 | 源 GIF | 无损 @原宽 | 无损 @展示宽 |
| --- | --- | --- | --- |
| `ppcfad02bcsupp2` | 12.02 MB @2100 | 9.68 MB | 13.06 MB @1200 |
| `frc` | 3.61 MB @1300 | 1.53 MB | 5.36 MB @1200 |

`frc` 只缩了 8% 的像素，无损体积涨 3.5 倍——LANCZOS 重采样把网点抖动打散成逐像素噪声，熵爆掉。所以无损 master **必须保持原宽**，那样总量 16.77 MB；但变体仍要构建期生成，sharp 删不掉，与目标冲突。

本方案 19.59 MB / 零构建期转码 / 响应式完整，取这条。

## 体积账

| | 基图 | 变体 | 小计 |
| --- | --- | --- | --- |
| `banana` 1000 | 1.62 | 480:0.35 800:0.95 | 2.92 |
| `fisbone` 771 | 1.06 | 480:0.41 | 1.47 |
| `frc` 1200 | 0.90 | 480:0.33 800:0.51 | 1.74 |
| `ppcfad02bcsupp2` 1200 | 5.00 | 480:0.97 800:2.42 | 8.39 |
| `psi_pres_con` 640 | 3.02 | 480:2.04 | 5.06 |
| **合计** | 11.60 | 7.99 | **19.59 MB** |

加 press 静态图 AVIF 约 1 MB，`public/` 图片总量约 20.6 MB —— **现状 43 MB 的 48%**。

## 基图缩放与 MDX 尺寸同步

`frc`（1300→1200）和 `ppcfad02bcsupp2`（2100→1200）的基图要缩小，**MDX 的 `width`/`height` 必须同步改写**，否则 `srcset` 的 `w` 描述符与实际文件宽度不符：

| 图 | 原 `width`×`height` | 新 `width`×`height` |
| --- | --- | --- |
| `frc` | 1300×450 | 1200×415 |
| `ppcfad02bcsupp2` | 2100×1000 | 1200×571 |

`banana`(1000) / `fisbone`(771) / `psi_pres_con`(640) 的 `displayWidth` 等于固有宽度，不缩放，尺寸不动。

规则：**transform 只在真的缩放了某张图时改写它的 `width`/`height`**，按 `round(h * newW / oldW)` 算新高度。press 静态图不缩放，尺寸一律不动。

## 变体宽度必须与运行时一致

`responsiveImageAttributes()` 用 `IMAGE_VARIANT_WIDTHS.filter(w => w < intrinsicWidth)` 生成 srcSet。transform 必须用**同一个来源**算变体宽度（直接 import `IMAGE_VARIANT_WIDTHS`），否则标记里的候选和磁盘上的文件会对不上。

于是各图的变体集合天然对齐：1000→480/800、771→480、1200→480/800、640→480。

## 静态图：press 与排除项

`public/assets/press/**/*.{png,jpg,jpeg}` → 同名 `.avif`，保持固有宽度、**不生成变体**（`.avif` 不触发 srcSet，出单图）。

排除：

- `public/og-image.png`、`public/logos/fusim-logo-512.png` —— README 要求 `og:image` 与 JSON-LD `logo` 必须是 PNG
- `*.svg`

## 风险

| 风险 | 对策 |
| --- | --- |
| 变体宽度与 srcSet 不一致 → 死链 | transform 直接 import `IMAGE_VARIANT_WIDTHS`，并用 `responsiveImageAttributes` 反查生成的文件名做断言测试 |
| 改了 `width` 但漏改 `height` → 宽高比错乱 | 同一正则块内成对替换；测试锁住 |
| AVIF 无回退，Safari <16.4 / Firefox <93 空白 | 覆盖率 96.33%，且仅用于 press 非关键图 |
| 源 GIF 删除后无法重编 | 执行前备份到仓库外；且 master 已入库，重编变体不需要源图 |

## 未定

历史里那 43 MB GIF 与原 PDF 是否 `filter-repo` + 强推清除。**需要单独确认**，属不可逆操作。
