# cbaldur-home

基于 [Lume](https://lume.land/) v3.1.2（Deno）构建的静态站点，用于 FUSIM 综合门户（公司介绍 / 公司博客 / 产品矩阵 / 企业责任）。

## 环境要求

- Deno >= v2.4.0

## 本地开发

- 启动开发服务器（热更新）：`deno task serve`
- 生产构建（输出到 `_site/`）：`deno task build`
- 运行任意 Lume 命令：`deno task lume <args>`

## 项目结构

- `_config.ts`：Lume 站点配置（站点数据、插件、资源拷贝等）
- `deno.json`：Deno 配置（imports / tasks / permissions）
- `index.vto`：首页模板
- `about/`：公司介绍页面
- `journal/`：博客列表页与文章（Markdown）
- `products/`：产品矩阵页面
- `responsibility/`：企业责任页面
- `assets/`：静态资源（如 `assets/styles.css`）
- `_includes/`：布局与组件（模板相关）
- `_site/`：构建输出目录（自动生成）
- `_cache/`：Lume 缓存目录（自动生成）

## 内容更新建议

- 页面入口通常是各目录下的 `index.vto`；博客文章位于 `journal/*.md`。
- 构建产物位于 `_site/`，不要直接在该目录里改内容。

