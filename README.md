# 聚核智算 FUSIM 官网

基于 **React 19 + wouter + styled-components + MDX** 重写的 FUSIM 企业门户，内容与页面结构对齐原 Lume 站点（`fusim-homepage/`）：首页、公司新闻、社会报导、产品矩阵、论文发表、关于我们、企业责任，以及论文附件目录页。

## 技术栈

| 能力 | 方案 |
| --- | --- |
| UI | React 19 + TypeScript |
| 路由 | [wouter](https://github.com/molefrog/wouter)（SPA 客户端路由） |
| 样式 | [styled-components](https://styled-components.com/)（组件化 CSS-in-JS，仓库内无 `.css` 文件） |
| 内容 | MDX（`@mdx-js/mdx`）+ YAML frontmatter + GFM + MathJax v4（构建期 SVG） |
| 编译 | TypeScript 5 只做类型检查；TSX 由 Babel 转译（dev 带 Fast Refresh 插桩） |
| 构建 | webpack 5（见「构建管线」） |

组件样式是 `src/styles/*.ts` 里导出的 styled 组件，页面直接用组件、变体用 `$` 前缀的 transient props。
全局样式（CSS 变量、暗色覆盖、重置、`body` 背景）内联在 `index.html` 的 `<head>` 里：它们必须首屏生效，
交给运行时注入会先闪一帧白底。仓库里因此既没有 `.css` 文件，也没有运行时全局样式注入。
颜色仍走 `var(--*)`，暗色主题由 `index.html` 的内联脚本设置 `html[data-theme]` 驱动，不经过 React。

数学公式在**构建期**由 `webpack-plugins/mathjax.ts` 调用 MathJax v4 渲染成自包含 SVG（字形路径内嵌、
无外部字体与样式表），因此**产物里没有任何 CSS 文件**。

## 常用命令

```bash
npm run dev        # 本地开发（http://localhost:5000，改组件走 Fast Refresh）
npm run build      # SPA 构建，产物在 dist/（index.html + 静态资源 + 404.html 回退页）
npm run preview    # 预览构建产物（本地静态服务，带 404 回退）
npm run lint       # oxlint
npm test           # webpack-plugins 单元测试（node --test）
```

> 站点是单页应用（SPA）：由 `index.html` 加载 JS 后渲染页面，未命中的路径回退到 `404.html`。

## 构建管线

| 步骤 | 做什么 |
| --- | --- |
| `tsc -b` | 只看类型（`tsconfig.app.json` / `tsconfig.node.json`），不产出文件 |
| `babel-loader` | 逐模块去掉类型、把 JSX 转成 `react/jsx-runtime` 调用；dev 下同时插 Fast Refresh 的钩子 |
| `webpack` | 打包 + 发静态资源 |

- **TSX 为什么由 Babel 编**：Fast Refresh 需要在编译期往每个组件里插 `$RefreshReg$` / `$RefreshSig$`
  （Webpack 侧再由 `@pmmmwh/react-refresh-webpack-plugin` 换成运行时调用）。`tsc` 不做这类插桩，
  也不该在 dev 里逐模块编 TSX（Fast Refresh 与增量都指望转译器），所以它只负责类型检查
  （`npm run build` 的第一步）。
- **MDX 不经过 Babel**：`webpack-plugins/mdx.ts` 用 `jsx: false` 直接产出 `react/jsx-runtime` 调用，
  不需要 JSX 转译；编译后的代码再过 `webpack-plugins/webp-loader.ts` 改写图片引用。
  改 `.mdx` 内容会是整页刷新（没有 refresh 边界）。
- **虚拟模块**：`virtual:publications` 会被 webpack 当成 URI scheme，用 `NormalModuleReplacementPlugin`
  指到 `webpack-plugins/virtual-publications.js`，内容由 loader 生成；`addContextDependency` 盯住
  `public/assets/pub`，新增 / 删除附件会触发重编。

## 目录结构

```
index.html                  # SPA 入口模板（主题预设、字体、meta；HtmlWebpackPlugin 从这里生成产物）
webpack.config.mjs          # webpack 配置（rules / Babel 选项 / 插件 / devServer）
webpack-plugins/
  mdx.ts                    # loader：把 .mdx 编译成 jsx-runtime 调用（frontmatter / GFM）
  mathjax.ts                # 构建期把 $...$ / $$...$$ 用 MathJax v4 渲染成自包含 SVG
  publications.ts           # loader：扫描 public/assets/pub，生成 virtual:publications
  webp.ts                   # 插件：build 时转码 public 图片、发布 public 资源（带磁盘缓存）
  webp-loader.ts            # loader：把模块里的图片引用改成 .webp
  virtual-publications.js   # 虚拟模块的占位落点（内容由 publications.ts 生成）
scripts/
  preview.mjs               # 预览 dist/（静态服务 + 404 回退）
  spa-fallback.mjs          # 复制 index.html -> 404.html
src/
  main.tsx                  # 客户端入口
  App.tsx                   # 路由表 + 标题同步
  components/               # Header / Footer / Layout / DataTree / 图标
  pages/                    # 各页面（首页、产品、论文、附件目录...）
  content/                  # 站点数据 + MDX 内容
  lib/                      # 内容索引、meta、论文数据
  styles/                   # styled 组件（global.ts 是 createGlobalStyle 的全局样式）
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

- **样式组织**：站点级复用样式在 `src/styles/shared.ts` / `layout.ts` / `hero.ts` / `prose.ts` /
  `publications.ts`，各自导出 styled 组件；只在单个页面用一次的组件（如日志正文的 `JournalArticle`）
  直接写在页面文件里。动画片段 `reveal` + `$delay`（0–3）实现入场级联。
- **数学公式**：`webpack-plugins/mathjax.ts` 只加载 MathJax 的 `input/tex` + `output/svg` + `adaptors/liteDOM`，
  不加载 `a11y/sre`（它会在 Node 里起 worker thread 让构建进程无法退出，且让公式体积翻三倍）。
  SVG 自带字形路径，用 `aria-label` 写入 TeX 源码作为可访问名称。相同公式按 `display + tex` 缓存。
- **移动端导航**：原模板在展开菜单时，关闭按钮会被挤到第三行；这里用 `order` 让「品牌 + 操作按钮」
  始终位于第一行。
- **论文附件**：「更新」时间取 PDF 的文件修改时间，因此与构建环境中的文件时间有关。
- **原 `<style>` 覆盖**：`products/service_*.md` 里用于把正文放宽到 2400px 的 `<style>` 块
  改为 frontmatter 的 `wide: true`，由 `ProseArticle` 的 `$wide` 变体实现（效果一致，且不会污染全局）。
- **代码块**：MDX 代码块会得到 `.prose pre / code` 样式，但不再引入 Prism 语法高亮
  （原站点内容中没有代码块；需要时可加 `rehype-prism-plus`）。
- **图片转 WebP**：`webpack-plugins/webp.ts`（插件）在编译前把 `public/` 下的图片转成 WebP，
  `webpack-plugins/webp-loader.ts` 把模块里的引用改成 `.webp`，`index.html` 走同一份改写集；
  `dist/` 里只留一份更小的字节。规则如下：

  - **扫描范围**：`public/`（含子目录）里的 `.png` / `.jpg` / `.jpeg` / `.gif`。public 里已有同名 `.webp`（软链接文件也算）、
    或目标名已被另一张源图占用的源图会跳过并保留原图。
  - **默认质量**：`webp({ quality: 75, effort: 4 })`，本站自选默认（sharp 自身的 WebP quality 默认是 80），
    多帧图（metadata 的 `pages > 1`，本站 GIF 均属此类）显式加 `animated: true` 保留全部帧，
    编码前按 EXIF 方向自动摆正。转换是“无脑”的：变大的也转（如 `ppcfad02bcsupp2.gif` 12 MB → 13 MB）。
    全站实测 42 MB → 18 MB（-57%）。
  - **参数覆盖**：可在 `webpack.config.mjs` 里用 `new WebpPlugin({ quality, effort })` 覆盖默认值，
    缓存目录同理用 `cacheDir` 指定。
  - **源图去向**：`public/` 里的源图原样保留（仍受 git 跟踪）；产物里转码成功的图片只发 `.webp`
    （`processAssets` 阶段逐条 `emitAsset`），其余 public 文件原样发出。
  - **缓存**：转码结果按「语义版本 + 源路径 + mtime + 大小 + 质量 + effort」为键落在
    `node_modules/.cache/fusim-webp/`，第二次构建直接命中（实测 8.5 s → 0 s）。想手动重新转码，
    删掉该目录即可，下次构建自动重转。
  - **引用改写**：模块源码（tsc / MDX 编译之后）与 `index.html` 里的 `/assets/image/x.gif` 会替换为
    `/assets/image/x.webp`（按 URL 边界匹配，保留 query 与 hash；`%20` 等编码形态与原始字面量都会改写）。
    以模块方式导入 public 图片（如 `import photo from "/img/a.png"`）不受支持——本项目 public 图片一律以 URL 引用。
    dev 模式不预转换：请求 `.webp` 时由 devServer 中间件（插在静态服务之前）按需转码并缓存，
    新增的源图在重扫间隔后自动可用。转换失败的源图不改写引用，产物里保留可用原图。
  - **不做 AVIF**：sharp/libheif 的动图 AVIF 有「堆叠帧总高 ≤ 16384 px」的上限，本站动图
    （36 帧 × 450 px 已近顶，5 张 GIF 全部超出）都装不进去，收益抵不过成本，故只做 WebP。

## 部署

SPA 需要把未命中的路径回退到 `index.html`，构建脚本已生成 `dist/404.html`：

- GitHub Pages：直接使用 `dist/`（404 回退生效）；
- nginx：`try_files $uri $uri/ /index.html;`
- 对象存储 / CDN：把 404 文档指向 `404.html`。
- 论文附件中的大数据文件（dump / energy 等）不随构建产物发布，需单独上传到静态服务器的 `/assets/pub/...`。
