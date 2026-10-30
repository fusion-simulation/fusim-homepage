import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import type { Element, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { toText } from 'hast-util-to-text'
import { SKIP, visitParents } from 'unist-util-visit-parents'

/**
 * 用 MathJax v4 在**构建期**把 remark-math 产出的公式渲染成自包含 SVG。
 *
 * 之所以自己写插件：`rehype-mathjax` 仍锁在 mathjax-full@3，而我们要 v4。
 * SVG 自带字形路径（`<defs>` 内嵌），不需要任何外部 CSS 或字体，
 * 因此产物里没有样式表。
 */

type MathJaxAdaptor = {
  serializeXML(node: unknown): string
  tags(node: unknown, tag: string): unknown[]
}

type MathJaxInstance = {
  startup: { promise: Promise<unknown>; adaptor: MathJaxAdaptor }
  tex2svgPromise(
    tex: string,
    options: { display: boolean; em?: number; ex?: number },
  ): Promise<unknown>
}

/** `display + tex` → 序列化后的 `<svg>`；存 Promise 而不是字符串，并发公式才能共享同一次排版。 */
const cache = new Map<string, Promise<string>>()
let loading: Promise<MathJaxInstance> | undefined

async function loadMathJax(): Promise<MathJaxInstance> {
  const scope = globalThis as { MathJax?: MathJaxInstance }

  scope.MathJax = {
    loader: {
      paths: { mathjax: '@mathjax/src/bundle' },
      // 只要 TeX 输入 + SVG 输出 + liteDOM：不加载 a11y/sre（它会为语音合成起一个
      // worker thread，让 node 进程无法退出，且让每个公式多背 3 倍体积的语义属性）。
      load: ['input/tex', 'output/svg', 'adaptors/liteDOM'],
      require: (file: string) => import(file),
    },
    output: { font: 'mathjax-newcm', fontCache: 'local' },
    startup: { typeset: false },
  } as never

  // 用 createRequire + 文件 URL 动态导入：绕开 Vite 在打包配置文件时对该包的静态解析
  const require = createRequire(import.meta.url)
  await import(pathToFileURL(require.resolve('@mathjax/src/bundle/startup.js')).href)

  const instance = scope.MathJax as MathJaxInstance
  await instance.startup.promise
  return instance
}

function getMathJax(): Promise<MathJaxInstance> {
  if (!loading) {
    loading = loadMathJax().catch((error: unknown) => {
      loading = undefined
      throw error
    })
  }
  return loading
}

function render(tex: string, display: boolean): Promise<string> {
  const key = `${display}:${tex}`
  const cached = cache.get(key)
  if (cached) return cached

  const pending = typeset(tex, display).catch((error: unknown) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, pending)
  return pending
}

async function typeset(tex: string, display: boolean): Promise<string> {
  const mathjax = await getMathJax()
  const node = await mathjax.tex2svgPromise(tex, { display, em: 16, ex: 8 })
  return mathjax.startup.adaptor.serializeXML(mathjax.startup.adaptor.tags(node, 'svg')[0])
}

function classesOf(element: Element): string[] {
  const value = element.properties.className
  return Array.isArray(value) ? value.map(String) : []
}

/** 包裹节点：行内用 span，行间用居中的 div（不产出需要 MathJax 样式表的 mjx-container）。 */
function wrap(svg: string, tex: string, display: boolean): Element {
  let children: Element['children']

  try {
    const fragment = fromHtml(svg, { fragment: true })
    const root = fragment.children[0]
    // 没有 a11y/sre 就没有语音文本，用 TeX 源码当可访问名称，至少不是「一张无名的图」
    if (root && root.type === 'element' && root.tagName === 'svg') {
      root.properties.ariaLabel = tex
    }
    children = fragment.children as Element['children']
  } catch {
    // 单个公式解析失败只影响这一处，不应中断编译
    return {
      type: 'element',
      tagName: 'span',
      properties: { className: ['math', 'math-inline'] },
      children: [{ type: 'text', value: tex }],
    }
  }

  return {
    type: 'element',
    tagName: display ? 'div' : 'span',
    properties: display
      ? { className: ['math', 'math-display'], style: 'text-align: center' }
      : { className: ['math', 'math-inline'] },
    children,
  }
}

export function mathjax() {
  return async (tree: Root): Promise<void> => {
    const jobs: Array<() => Promise<void>> = []

    visitParents(tree, 'element', (element, parents) => {
      const classes = classesOf(element)
      const languageMath = classes.includes('language-math')
      const mathDisplay = classes.includes('math-display')
      const mathInline = classes.includes('math-inline')

      if (!languageMath && !mathDisplay && !mathInline) return

      let parent = parents[parents.length - 1]
      let target: Element = element
      let display = mathDisplay

      // ```math 代码块 / $$...$$：remark-math 会产出 <pre><code class="language-math math-display">，
      // 要替换整个 <pre>，否则 <pre> 里会套一个块级 div。
      if (
        element.tagName === 'code' &&
        languageMath &&
        parent?.type === 'element' &&
        parent.tagName === 'pre'
      ) {
        target = parent
        parent = parents[parents.length - 2]
        display = true
      }

      if (!parent) return

      const tex = toText(target, { whitespace: 'pre' })

      jobs.push(async () => {
        let svg = ''
        try {
          svg = await render(tex, display)
        } catch {
          // MathJax 抛错时降级成原文本，构建与页面渲染都不能失败
        }

        const node = svg
          ? wrap(svg, tex, display)
          : {
              type: 'element' as const,
              tagName: 'span',
              properties: { className: ['math', 'math-inline'] },
              children: [{ type: 'text' as const, value: tex }],
            }

        const index = parent.children.indexOf(target)
        if (index !== -1) parent.children.splice(index, 1, node)
      })

      return SKIP
    })

    await Promise.all(jobs.map((job) => job()))
  }
}
