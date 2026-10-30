# 用 webpack 替换 Vite

> 2026-10-31

## 意图

把构建工具从 Vite 8（Rolldown）换成 webpack 5，同时保住现有构建行为：MDX + MathJax 构建期渲染、
论文附件扫描进虚拟模块、`public/` 图片转 WebP 并改写引用、SPA 的 `404.html` 回退、以及"产物里没有 CSS 文件"
（styled-components + `index.html` 内联首屏样式）。

## 约束

- 类型检查交给 TypeScript 5（`tsc -b` 是唯一的类型门禁）。
- `styled-components` 与仓库里"无 `.css` 文件"的约定不变，不需要任何 CSS loader。
- 版本库里的源图保持 `public/`（git 跟踪），只有产物换成 `.webp`。
- dev server 端口沿用 `5173`，`/products/x/` 这类客户端路由要能直接访问。

## 方案

| 方案 | 取舍 |
| --- | --- |
| A. `swc-loader` 逐模块编译 | 增量最快、Fast Refresh 现成，但引入一个额外转译器 |
| B. `tsc --outDir` 产物树 + webpack 打包产物树 | 不需要 loader，但两份目录、两套监听，路径与调试映射都别扭 |
| C. 编译前整体跑 tsc，loader 只读产物 | 不需要额外转译器，但没有 Fast Refresh，且 dev 每轮多 0.2s |
| **D. `babel-loader` 逐模块转译（选中）** | TSX 交给 Babel，`tsc` 退回只做类型检查；换来官方 Fast Refresh 链路 |

选 D 的原因：Fast Refresh 要求在编译期往每个组件里插 `$RefreshReg$` / `$RefreshSig$`，
这必须由"编译 TSX 的那一步"完成。`tsc` 不会插这类钩子，方案 C（无论 tsc 7 还是 5）都只能整页刷新。
Babel 是 webpack 生态里这条链路的默认实现（`react-refresh/babel` + `@pmmmwh/react-refresh-webpack-plugin`），
代价是转译与类型检查分家——这本来就是 CRA / Vite-Babel 的常态。

### 为什么不用 ts-loader（方案 C 的由来与弃用）

中间试过一条"tsc 当转译器"的路：先按 TypeScript 7（原生 tsc）实现，那版的原生包里
`unstable/*` 编程 API 没有 emit（`Emitter` 只能把 AST 打印回源码文本），逐模块调 CLI 实测约 180ms/次，
于是做成"`beforeCompile` 整编一次、loader 按文件取产物"。它跑通了，但换不来 Fast Refresh。
现在 TypeScript 回到 5.9（有完整的编译器 API，`ts-loader` 可用），可结论没变：Fast Refresh 的插桩
只有 Babel / swc 这类转译器能做，所以 C 的实现（`tsc-emit.ts` / `tsc-loader.ts` / `tsconfig.emit.json`）
已删除，转译统一交给 Babel。

## 实现

| 原 Vite 能力 | webpack 形态 |
| --- | --- |
| `import.meta.glob('../content/**/*.mdx', { eager: true })` | `import.meta.webpackContext` |
| `resolveId` / `load` 生成 `virtual:publications` | `NormalModuleReplacementPlugin` + `publications.ts` loader（`addContextDependency` 盯附件目录） |
| `vite-plugins/mdx.ts`（`transform`） | `webpack-plugins/mdx.ts`（loader，`jsx: false` 直接产出 jsx-runtime 调用） |
| `vite-plugins/webp.ts`（`transform` + `transformIndexHtml` + `configureServer` + `closeBundle`） | `webpack-plugins/webp.ts`（插件：`beforeCompile` 转码、`processAssets` 发资源）+ `webp-loader.ts`（模块改写）+ `templateContent`（`index.html` 改写）+ `devServer.setupMiddlewares`（按需转码） |
| `vite-plugins/mathjax.ts` | 原样迁入，纯 remark/rehype |
| `@vitejs/plugin-react` 的 dev 插桩 | `babel-loader` 的 `react-refresh/babel` + `ReactRefreshWebpackPlugin`（仅 dev） |
| `vite build` + `vite preview` | `webpack --mode production` + `scripts/preview.mjs` |

`tsconfig.app.json` 去掉 `types: ["vite/client"]`，保留 `allowImportingTsExtensions`（源码里显式写 `.tsx`）。
`babel-loader` 的 preset 只做两件事：去类型（`onlyRemoveTypeImports`，对齐 `verbatimModuleSyntax`）、
JSX → `react/jsx-runtime`；不做 `preset-env` 降级（`target: ['web','es2022']` 与 `tsc` 的 target 一致）。

## 已知差异

- **改 `.mdx` 内容仍是整页刷新**：MDX 编译结果不经过 Babel，没有 refresh 边界。
- **dev 新增源图不是立即改写**：没有文件监听，devServer 中间件在请求未命中且过了 1s 重扫间隔时补扫。
- **产物多出 `assets/*.LICENSE.txt`**：webpack 默认从压缩产物里抽取 `@license` 注释，无害。
- **`npm run preview` 对未命中路由回 404 状态**（body 是 `404.html`）：与 GitHub Pages / nginx 的实际行为一致，
  不再是 Vite preview 的 200。
