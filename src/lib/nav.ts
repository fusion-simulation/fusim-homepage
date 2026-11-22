/**
 * 导航激活判定：抽成纯函数，好在 node --test 里直接验证，SSR 与客户端共用同一份逻辑。
 *
 * 按**路径边界**匹配，而不是裸 `startsWith`：`/products-extra/` 不该点亮「产品矩阵」。
 */

/** 去掉 query / hash 与尾斜杠，得到便于比较的路径。 */
function trimPath(path: string): string {
  const [raw] = path.split(/[?#]/)
  const trimmed = (raw ?? '').replace(/\/+$/, '')
  return trimmed === '' && raw?.startsWith('/') ? '/' : trimmed
}

/**
 * `href` 是否是当前路径对应的导航项。
 * 首页（`/`）只在根路径激活；其余路径连同其子路径都算激活（`/journal/x/` → `/journal/`）。
 */
export function isActivePath(location: string, href: string): boolean {
  const root = trimPath(href)
  const current = trimPath(location)

  if (root === '/' || root === '') return current === '/'

  return current === root || current.startsWith(`${root}/`)
}

/**
 * 导航项的 `aria-current` 取值：本级页面用 `page`，只是祖先路径用 `true`。
 * 详情页（`/journal/x/`）里「公司新闻」不是当前页，读屏不该说成「当前页面」。
 */
export function currentPageAttr(location: string, href: string): 'page' | 'true' | undefined {
  if (!isActivePath(location, href)) return undefined

  return trimPath(location) === trimPath(href) ? 'page' : 'true'
}
