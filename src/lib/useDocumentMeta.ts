import { useEffect } from 'react'
import { resolveMeta } from '../lib/meta'

/**
 * 客户端路由切换时同步 `<title>` 与 description；
 * 构建期由预渲染脚本直接写入 HTML 头部。
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
