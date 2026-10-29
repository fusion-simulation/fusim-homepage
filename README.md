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
  部署时单独上传到静态服务器的 `/assets/pub/...` 即可。

  > 附件列表与目录页是**构建期扫描本地文件**生成的：如果构建时 `public/assets/pub` 下没有这些文件，
  > 页面上也不会列出它们（文件本身仍可通过直链访问）。

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

## 部署

SPA 需要把未命中的路径回退到 `index.html`，构建脚本已生成 `dist/404.html`：

- GitHub Pages：直接使用 `dist/`（404 回退生效）；
- nginx：`try_files $uri $uri/ /index.html;`
- 对象存储 / CDN：把 404 文档指向 `404.html`。
- 论文附件中的大数据文件（dump / energy 等）不随构建产物发布，需单独上传到静态服务器的 `/assets/pub/...`。

若不确定托管平台是否支持回退，可使用 `npm run build:ssg` 生成真实的多页面 HTML。
