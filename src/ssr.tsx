import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'
import { Router } from 'wouter'
import { App } from './App.tsx'
import { site } from './content/site.ts'
import { contentPageByUrl } from './lib/content.ts'
import { normalizePath, resolveMeta, staticRoutePaths } from './lib/meta.ts'
import { attachmentDirByUrl } from './lib/publications.ts'

/** 未知路径的哨兵：只用于渲染 404 页的完整 App 树，客户端永远不会请求它。 */
export const NOT_FOUND_PATH = '/__404__/'

/** 与 webpack-plugins/prerender.ts 的 SiteInfo 结构一致（刻意不互相 import，避免 server bundle 混进纯函数模块）。 */
export const siteInfo = {
  url: site.url,
  name: site.name,
  alternateName: 'FUSIM',
  email: site.email,
  logo: `${site.url}/logos/fusim-logo-512.png`,
  ogImage: `${site.url}/og-image.png`,
}

export type RenderedPage = {
  url: string
  title: string
  description: string
  ogType: 'website' | 'article'
  date?: string
  notFound: boolean
  body: string
  styles: string
}

/** 全部要预渲染的路由：静态页 + MDX 内容页 + 论文附件目录页。 */
export const routes: string[] = [
  ...new Set([...staticRoutePaths, ...contentPageByUrl.keys(), ...attachmentDirByUrl.keys()]),
].sort()

function isKnownPath(url: string): boolean {
  return staticRoutePaths.includes(url) || contentPageByUrl.has(url) || attachmentDirByUrl.has(url)
}

/** 在 Node 里渲染单个路由：wouter 注入固定路径（navigate 是空实现），样式由 ServerStyleSheet 收集。 */
export function render(pathname: string): RenderedPage {
  const url = normalizePath(pathname)
  const page = contentPageByUrl.get(url)
  const isJournal = page?.kind === 'journal'
  const sheet = new ServerStyleSheet()

  try {
    const body = renderToString(
      <StyleSheetManager sheet={sheet.instance}>
        <Router hook={() => [url, () => {}] as [string, () => void]}>
          <App />
        </Router>
      </StyleSheetManager>,
    )

    return {
      url,
      ...resolveMeta(url),
      ogType: isJournal ? 'article' : 'website',
      date: isJournal ? page.frontmatter.date : undefined,
      notFound: !isKnownPath(url),
      body,
      styles: sheet.getStyleTags(),
    }
  } finally {
    sheet.seal()
  }
}
