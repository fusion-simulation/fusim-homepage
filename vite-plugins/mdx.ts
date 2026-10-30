import { compile } from '@mdx-js/mdx'
import type { Plugin } from 'vite'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { mathjax } from './mathjax.ts'

const MDX_RE = /\.mdx?$/

/**
 * 将 `.mdx` / `.md` 编译为 React 组件。
 *
 * 功能对齐原 Lume 站点的 `remark()` + `katex()` 插件：
 * - YAML frontmatter 以 `frontmatter` 具名导出
 * - GFM（表格 / 任务列表 / 删除线等）
 * - `$...$` / `$$...$$` 数学公式（构建期用 MathJax v4 渲染成自包含 SVG）
 */
export function mdx(): Plugin {
  return {
    name: 'fusim:mdx',
    enforce: 'pre',
    async transform(code: string, id: string) {
      const [filename] = id.split('?')
      if (!filename || !MDX_RE.test(filename)) return null

      const compiled = await compile(code, {
        jsxImportSource: 'react',
        remarkPlugins: [
          remarkFrontmatter,
          remarkMdxFrontmatter,
          remarkGfm,
          remarkMath,
        ],
        rehypePlugins: [mathjax],
      })

      return { code: String(compiled), map: null }
    },
  }
}
