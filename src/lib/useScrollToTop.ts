import { useEffect, useRef } from 'react'

/**
 * 客户端路由切换后回到页面顶部（对齐原多页站点的行为）。
 * 浏览器前进 / 后退时保留浏览器自身的滚动位置。
 */
export function useScrollToTop(pathname: string) {
  const isHistoryNavigation = useRef(false)
  const isInitialRender = useRef(true)

  useEffect(() => {
    const onPopState = () => {
      isHistoryNavigation.current = true
      setTimeout(() => {
        isHistoryNavigation.current = false
      }, 0)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname 只作触发条件，effect 本身不读它
  useEffect(() => {
    // 首次加载交给浏览器自身的滚动恢复（刷新后停留在原位置）
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    if (isHistoryNavigation.current) return
    window.scrollTo(0, 0)
  }, [pathname])
}
