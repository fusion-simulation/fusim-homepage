/**
 * 文档级 meta 的纯策略层：给定「这一页是什么」，算出该写哪些标签。
 *
 * 抽出来是因为真正的写入发生在 `useDocumentMeta` 的 effect 里（碰 DOM），
 * 而 `resolveMeta` 依赖 webpack 的 context 模块，两者在 node --test 里都跑不了。
 */

export type MetaTagPlan = {
  title: string
  description: string
  /** `null` 表示必须删掉 `<link rel="canonical">`（404 不写 canonical）。 */
  canonical: string | null
  /** `null` 表示必须删掉 `meta[name=robots]`。 */
  robots: 'noindex' | null
}

export type MetaTagInput = {
  title: string
  description: string
  /** 已归一化（以 `/` 开头并以 `/` 结尾）的站点路径。 */
  url: string
  /** `site.url`，允许带或不带尾斜杠。 */
  siteUrl: string
  /** 未知路径（404）为 false：不写 canonical 且标 noindex。 */
  indexable: boolean
}

/** 拼接绝对地址时只保留一个 `/`，与 `site.url` 是否带尾斜杠无关。 */
function absolute(siteUrl: string, url: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${url}`
}

export function metaTagPlan({
  title,
  description,
  url,
  siteUrl,
  indexable,
}: MetaTagInput): MetaTagPlan {
  return {
    title,
    description,
    // 404 页指向自己的地址会把整站权重导向一个不存在的页面
    canonical: indexable ? absolute(siteUrl, url) : null,
    robots: indexable ? null : 'noindex',
  }
}
