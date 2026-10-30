import { useEffect } from 'react'
import { resolveMeta } from '../lib/meta'

/**
 * 客户端路由切换时同步 `<title>` 与 description；
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
  }, [url])
}
