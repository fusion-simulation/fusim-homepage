import { useEffect } from 'react'
import { site } from '../content/site'
import { resolveMeta } from '../lib/meta'
import { metaTagPlan } from '../lib/meta-policy'

/** 取到（必要时创建）head 里的单例标签。 */
function ensureMeta(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.head.querySelector<HTMLElement>(selector)
  if (existing) return existing

  const tag = create()
  document.head.append(tag)
  return tag
}

/**
 * 客户端路由切换时同步 `<title>`、description、canonical 与 robots；
 * 首次进入与后续导航都由本 hook 写入，404 会删掉 canonical 并标 noindex。
 */
export function useDocumentMeta(url: string) {
  useEffect(() => {
    const plan = metaTagPlan({ ...resolveMeta(url), url, siteUrl: site.url })
    document.title = plan.title

    ensureMeta('meta[name="description"]', () => {
      const tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      return tag
    }).setAttribute('content', plan.description)

    // SPA 跳转后 canonical 必须跟着走；404 则必须删掉，不能指向不存在的地址
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (plan.canonical === null) {
      canonical?.remove()
    } else {
      const tag =
        canonical ??
        (() => {
          const created = document.createElement('link')
          created.rel = 'canonical'
          document.head.append(created)
          return created
        })()
      tag.href = plan.canonical
    }

    // 预渲染的 404.html 自带 noindex，客户端导航到已知页面时要能撤掉
    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (plan.robots === null) {
      robots?.remove()
    } else {
      const tag =
        robots ??
        (() => {
          const created = document.createElement('meta')
          created.setAttribute('name', 'robots')
          document.head.append(created)
          return created
        })()
      tag.setAttribute('content', plan.robots)
    }
  }, [url])
}
