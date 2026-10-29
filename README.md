# 聚核智算 FUSIM 官网

基于 **React 19 + wouter + Griffel + MDX** 重写的 FUSIM 企业门户，内容与页面结构对齐原 Lume 站点（`fusim-homepage/`）：首页、公司新闻、社会报导、产品矩阵、论文发表、关于我们、企业责任，以及论文附件目录页。

## 技术栈

| 能力 | 方案 |
| --- | --- |
| UI | React 19 + TypeScript |
| 路由 | [wouter](https://github.com/molefrog/wouter)（SPA 客户端路由） |
| 样式 | [Griffel](https://griffel.js.org/)（`makeStyles` 原子化 CSS-in-JS） |
| 内容 | MDX（`@mdx-js/mdx`）+ YAML frontmatter + GFM + KaTeX |
| 构建 | Vite 8（Rolldown） |

Griffel 通过 `@griffel/vite-plugin` 在**构建期**完成样式求值与 CSS 抽取：生产环境不注入任何运行时样式代码，样式由 Vite 生成的 CSS 文件直接加载。

## 常用命令

```bash
npm run dev        # 本地开发（http://localhost:5173）
npm run build      # SPA 构建，产物在 dist/（index.html + 静态资源 + 404.html 回退页）
npm run build:ssg  # 可选：预渲染每个路由为独立 HTML（dist/about/index.html 等）
npm run preview    # 预览构建产物
npm run lint       # oxlint
npm test           # vite-plugins 单元测试（node --test）
```

> `build` 是默认形态：单页应用（SPA），由 `index.html` 加载 JS 后渲染页面。
> 如果希望构建时就把每个路由“写死”成 HTML（利于 SEO、无 JS 环境访问），使用 `build:ssg`。

## 目录结构

```
index.html                  # SPA 入口（主题预设、字体、meta）
vite.config.ts              # Vite 配置（MDX / Griffel / 论文附件扫描插件）
vite-plugins/
  mdx.ts                    # 把 .mdx 编译为 React 组件（frontmatter / GFM / KaTeX）
  publications.ts           # 构建期扫描 public/assets/pub，生成 virtual:publications
  webp.ts                   # build 时把 public 图片转为 WebP 并改写引用（带磁盘缓存）
scripts/
  spa-fallback.mjs          # 复制 index.html -> 404.html
  prerender.mjs             # build:ssg 的预渲染脚本
src/
  main.tsx                  # 客户端入口
  entry-server.tsx          # 仅 build:ssg 使用的 SSR 入口
  App.tsx                   # 路由表 + 标题同步
  components/               # Header / Footer / Layout / DataTree / 图标
  pages/                    # 各页面（首页、产品、论文、附件目录...）
  content/                  # 站点数据 + MDX 内容
  lib/                      # 内容索引、meta、论文数据
  styles/                   # Griffel 样式（global.css 只放 CSS 变量与全局重置）
public/assets/              # 图片、论文 PDF 等静态资源
```

## 内容维护

- **产品**：在 `src/content/products/` 新增 `.mdx`，例如

  ```mdx
  ---
  title: 新产品
  description: 一句话介绍（页面 meta description）
  order: 20
  desp: 卡片上的短描述
  product_section: saas
  ---

  正文支持 **Markdown**、GFM、`$E=mc^2$` 公式与 JSX。
  ```

  页面类型完全由目录决定，frontmatter 不需要 `type` / `layout` / `prose` 之类的字段：

  | 目录 | 渲染方式 |
  | --- | --- |
  | `products/*.mdx` | 产品页（prose + 卡片） |
  | `products/sections/*.mdx` | 产品分组（列表页区块，也可独立访问） |
  | `journal/*.mdx` | 日志列表 + 详情页 |
  | 其他目录 | 普通正文页 |

- **frontmatter 字段**（只保留真正会用到的）：

  | 字段 | 作用 |
  | --- | --- |
  | `title` | 页面标题 / 卡片标题 / 分组标题 |
  | `description` | meta description；产品卡片描述兜底 |
  | `order` | 产品与分组排序 |
  | `desp` | 产品卡片短描述 |
  | `external_url` | 产品卡片外链（有则新窗口打开） |
  | `product_section` | 产品所属分组（对应分组的 `section_key`） |
  | `section_key` | 分组键，同时用作锚点 id |
  | `wide` | 宽版正文（2400px，对应原 `<style>` 覆盖） |
  | `date` | 日志日期（列表倒序、详情页展示） |

- **公司新闻 / 日志**：在 `src/content/journal/` 新增 `.mdx` 即可，列表与详情页会自动生成：

  ```mdx
  ---
  title: 新闻标题
  description: 新闻摘要
  date: 2026-01-06
  ---
  ```

- **论文与附件**：把 PDF 放到 `public/assets/pub/<年份>/<条目>/`。构建期会自动：
  - 以目录中的第一个 PDF 作为论文条目（标题取文件名）；
  - 同级的其他文件、子目录作为「附加文件」树展示；
  - 为每个子目录生成独立附件目录页（`/assets/pub/<年份>/<条目>/<子目录>/`）。

  所以请**先放文件、再构建**（`npm run dev` 时新增/删除附件会自动刷新）。

  论文附件中的大数据文件（`*.dat`、`*_dump.*`、`*_energy.*` 等）**不入库**（见 `.gitignore`），
  部署时单独上传到静态服务器的 `/assets/pub/...`。为了让这些远程文件也出现在列表与附件目录页中，
  在 `src/content/publications.manifest.json` 里声明：

  ```json
  {
    "attachments": [
      { "path": "2026/1/data/pe_gh052025x01_dump.40000", "size": 450698528 }
    ]
  }
  ```

  - `path`：相对 `public/assets/pub` 的路径；
  - `size`：字节数（可省略，省略时列表不显示大小）；
  - 本地文件会自动合并（同名以本地文件为准），清单里的目录同样会生成附件目录页。

- **页头 / 页脚 / 备案号 / 社会报导**：`src/content/site.ts`。

## 实现说明

- **Griffel 构建期抽取**：`@griffel/vite-plugin` 依赖 CSS 注释标记来识别、排序原子样式，因此
  `vite.config.ts` 中关闭了 `build.cssMinify`（否则压缩会丢掉标记，`@media` 规则将排在基础规则之前，
  导致移动端样式失效）。若需要压缩 CSS，请改用保留注释的压缩方案。
- **移动端导航**：原模板在展开菜单时，关闭按钮会被挤到第三行；这里用 `order` 让「品牌 + 操作按钮」
  始终位于第一行。
- **论文附件**：「更新」时间取 PDF 的文件修改时间，因此与构建环境中的文件时间有关。
- **原 `<style>` 覆盖**：`products/service_*.md` 里用于把正文放宽到 2400px 的 `<style>` 块
  改为 frontmatter 的 `wide: true`，由 Griffel 样式实现（效果一致，且不会污染全局）。
- **代码块**：MDX 代码块会得到 `.prose pre / code` 样式，但不再引入 Prism 语法高亮
  （原站点内容中没有代码块；需要时可加 `rehype-prism-plus`）。
- **图片转 WebP**：`vite-plugins/webp.ts` 在 build 时把 `public/` 下的图片转成 WebP，并把编译后模块与
  `index.html` 里的引用改成 `.webp`；`dist/` 里只留一份更小的字节。规则如下：

  - **扫描范围**：`public/`（含子目录）里的 `.png` / `.jpg` / `.jpeg` / `.gif`。public 里已有同名 `.webp`（软链接文件也算）、
    或目标名已被另一张源图占用的源图会跳过并保留原图。
  - **默认质量**：`webp({ quality: 75, effort: 4 })`，本站自选默认（sharp 自身的 WebP quality 默认是 80），
    多帧图（metadata 的 `pages > 1`，本站 GIF 均属此类）显式加 `animated: true` 保留全部帧，
    编码前按 EXIF 方向自动摆正。转换是“无脑”的：变大的也转（如 `ppcfad02bcsupp2.gif` 12 MB → 13 MB）。
    全站实测 42 MB → 18 MB（-57%）。
  - **参数覆盖**：可在 `vite.config.ts` 里用 `webpImages({ quality, effort })` 覆盖默认值，缓存目录
    同理用 `cacheDir` 指定。
  - **源图去向**：`public/` 里的源图原样保留（仍受 git 跟踪），只有 `dist/` 在拷入 WebP 后删除对应原图。
  - **缓存**：转码结果按「语义版本 + 源路径 + mtime + 大小 + 质量 + effort」为键落在
    `node_modules/.cache/fusim-webp/`，第二次构建直接命中（实测 8.5 s → 0 s）。想手动重新转码，
    删掉该目录即可，下次构建自动重转。
  - **引用改写**：编译后的模块代码与 `index.html` 里的 `/assets/image/x.gif` 会替换为
    `/assets/image/x.webp`（按 URL 边界匹配，保留 query 与 hash；`%20` 等编码形态与原始字面量都会改写）。
    以模块方式导入 public 图片（如 `import photo from "/img/a.png"`）不受支持——本项目 public 图片一律以 URL 引用。
    插件以 `enforce: 'pre'` 跑在 `vite:css` 之前，CSS 源码里的 `url()` 也在改写范围内；从 `public/` 原样拷贝进 `dist/`
    的文件仍不在改写范围内。dev 模式不预转换，
    请求 `.webp` 时由中间件按需转码并缓存，源图新增/删除时重扫改写集并整页刷新。转换失败的源图不改写引用，
    `dist/` 保留可用原图；发布（closeBundle）阶段拷贝 `.webp` 或删原图失败则构建报错中止，报告只统计发布成功的条目。
  - **不做 AVIF**：sharp/libheif 的动图 AVIF 有「堆叠帧总高 ≤ 16384 px」的上限，本站动图
    （36 帧 × 450 px 已近顶，5 张 GIF 全部超出）都装不进去，收益抵不过成本，故只做 WebP。
  - **预渲染不重复转码**：`build:ssg` 的 SSR 趟是独立进程，两趟唯一共享的事实是缓存目录——
    缓存里已有的就是 client 趟转成功的条目，SSR 趟只按缓存改写、不转码，明细表只打印一次。

## 部署

SPA 需要把未命中的路径回退到 `index.html`，构建脚本已生成 `dist/404.html`：

- GitHub Pages：直接使用 `dist/`（404 回退生效）；
- nginx：`try_files $uri $uri/ /index.html;`
- 对象存储 / CDN：把 404 文档指向 `404.html`。
- 论文附件中的大数据文件（dump / energy 等）不随构建产物发布，需单独上传到静态服务器的 `/assets/pub/...`。

若不确定托管平台是否支持回退，可使用 `npm run build:ssg` 生成真实的多页面 HTML。
