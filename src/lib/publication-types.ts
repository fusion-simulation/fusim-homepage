/**
 * 论文（`public/assets/pub`）扫描结果的共享类型。
 * 由构建期插件生成、同时在 React 页面中使用。
 */

export type PublicationItem = {
  url: string
  title: string
  meta: string
}

export type PublicationGroup = {
  year: string
  items: PublicationItem[]
}
