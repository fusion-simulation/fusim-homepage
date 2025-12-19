# AI 助手协作指南（AGENTS.md）

本文件用于指导 AI 编码助手在本仓库内工作，目的是保持代码风格一致、变更可控、构建稳定。

## 全局约定

- **修改原则**：优先做小而聚焦的改动；避免顺手重构与不相关清理。
- **产物目录**：`_site/`、`_cache/` 为构建/缓存产物目录，通常不手工编辑。

## 项目概览

本项目是基于 Deno 的静态站点，使用 [Lume](https://lume.land/) v3.1.2 构建。

站点为企业 FUSIM 的综合门户，包含四个板块：公司介绍、公司博客、产品矩阵、企业责任。

## 常用命令

- `deno task serve`：启动开发服务器（含热更新）
- `deno task build`：生产构建（输出到 `_site/`）
- `deno task lume <args>`：执行任意 Lume CLI 命令

## 目录与架构

- `_config.ts`：Lume 站点配置
- `deno.json`：Deno 配置（tasks / imports / permissions）
- `_includes/`：布局、组件等模板资源
- `assets/`：静态资源
- `_site/`：构建输出目录（通常 gitignore）
- `_cache/`：Lume 缓存目录（通常 gitignore）

Lume 采用**基于文件的路由**：页面可以用 `.md`、`.vto`等格式创建；以 `_` 开头的文件/目录属于特殊用途（布局、组件、数据等），不会作为普通页面输出。
