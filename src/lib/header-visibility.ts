/**
 * 页头「停在最上端就收起」的判定：抽成纯函数，好在 node --test 里直接验证。
 *
 * 收起页头依赖滚动事件把它叫回来，所以不能滚动的页面（内容不足一屏的 404 等）
 * 必须始终露出页头，否则导航永远出不来。
 */

/** 顶部剩余量小于这个值就算「停在最上端」，留点余量防止触控板在 0 附近抖动。 */
export const TOP_THRESHOLD = 8

/** 页面是否真的能滚动：留 1px 容差给小数的 scrollHeight。 */
export function isScrollable(scrollHeight: number, innerHeight: number): boolean {
  return scrollHeight - innerHeight > 1
}

/** 页头该不该收起：能滚动、且确实停在最上端。 */
export function shouldHideHeader(state: {
  scrollY: number
  scrollHeight: number
  innerHeight: number
}): boolean {
  return state.scrollY <= TOP_THRESHOLD && isScrollable(state.scrollHeight, state.innerHeight)
}
