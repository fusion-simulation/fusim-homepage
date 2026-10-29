import { renderToString } from 'react-dom/server'
import { Router } from 'wouter'
import { App } from './App.tsx'
import { getStaticPaths, resolveMeta } from './lib/meta.ts'

export { getStaticPaths }

export type RenderResult = {
  html: string
  meta: ReturnType<typeof resolveMeta>
}

/** 构建期把单个路由渲染为 HTML 字符串。 */
export function render(url: string): RenderResult {
  const html = renderToString(
    <Router ssrPath={url}>
      <App />
    </Router>,
  )

  return { html, meta: resolveMeta(url) }
}
