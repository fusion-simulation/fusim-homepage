import { compile } from '@mdx-js/mdx'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import type { LoaderContext } from 'webpack'
import { mathjax } from './mathjax.ts'

/**
 * 把 `.mdx` / `.md` 编译成 webpack 可直接吃下的 ESM。
 *
 * 功能对齐原 Lume 站点的 `remark()` + 数学公式插件：
 * - YAML frontmatter 以 `frontmatter` 具名导出
 * - GFM（表格 / 任务列表 / 删除线等）
 * - `$...$` / `$$...$$` 数学公式（构建期用 MathJax v4 渲染成自包含 SVG，见 mathjax.ts）
 *
 * 输出用 `jsx: false`：MDX 直接产出 `react/jsx-runtime` 调用而不是 JSX 语法，
 * 因此不需要再过一遍 TS / Babel —— 这是「tsc 只负责 .ts/.tsx」这条管线的前提。
 */
export default function mdxLoader(
  this: LoaderContext<Record<string, never>>,
  source: string,
): void {
  const callback = this.async()
  if (!callback) throw new Error('[fusim:mdx] loader 必须异步调用：MDX 编译不在同步阶段完成')

  compile(source, {
    jsx: false,
    jsxImportSource: 'react',
    remarkPlugins: [
      remarkFrontmatter,
      remarkMdxFrontmatter,
      remarkGfm,
      remarkMath,
    ],
    rehypePlugins: [mathjax],
  }).then(
    (compiled) => callback(null, String(compiled)),
    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
  )
}
