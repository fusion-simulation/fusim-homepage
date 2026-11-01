import { useEffect } from 'react'
import { site } from '../content/site'
import { resolveMeta } from '../lib/meta'

/**
 * 客户端路由切换时同步 `<title>`、description 与 canonical；
 * 首次进入与后续导航都由本 hook 写入。
 */
export function useDocumentMeta(url: string) {
  useEffect(() => {
    const { title, description } = resolveMeta(url)
    document.title = title

    let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.append(tag)
    }
    tag.setAttribute('content', description)

    // SPA 跳转后 canonical 必须跟着走，否则整站都会指向首次进入的那一页
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = `${site.url}${url}`
  }, [url])
}
