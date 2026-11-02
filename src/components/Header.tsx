import { useEffect, useState } from 'react'
import { styled } from 'styled-components'
import { useLocation } from 'wouter'
import { shouldHideHeader } from '../lib/header-visibility'
import {
  Brand,
  BrandLogo,
  HeaderActions,
  HeaderBar,
  HeaderBarInner,
  iconCss,
  Nav,
  NavAnchor,
  NavCta,
  NavLink,
  NavToggle,
  ThemeButton,
} from '../styles/layout'
import { MenuIcon, MoonIcon, SunIcon, XIcon } from './Icons'

const LightIcon = styled(SunIcon)`
  ${iconCss}
  display: none;
  html[data-theme="light"] & {
    display: block;
  }
`

const DarkIcon = styled(MoonIcon)`
  ${iconCss}
  display: block;
  html[data-theme="light"] & {
    display: none;
  }
`

const Menu = styled(MenuIcon)`
  ${iconCss}
`

const Close = styled(XIcon)`
  ${iconCss}
`

/** 两种主题的背景色：与 index.html 的 `--bg` 一致，用于同步 theme-color。 */
const THEME_COLORS = { light: '#f7f8fa', dark: '#0a0c10' } as const

function toggleTheme() {
  const root = document.documentElement
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next
  // 与首屏脚本保持同一份底色，移动端地址栏不出现颜色跳变
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[next])

  try {
    localStorage.setItem('theme', next)
  } catch {
    /* localStorage 不可用时仅切换当前页面主题 */
  }
}

function ThemeToggle({ placement }: { placement: 'nav' | 'mobile' }) {
  return (
    <ThemeButton $placement={placement} aria-label="切换主题" onClick={toggleTheme}>
      <LightIcon />
      <DarkIcon />
    </ThemeButton>
  )
}

const NAV_ITEMS = [
  { href: '/products/', label: '产品矩阵' },
  { href: '/publications/', label: '论文发表' },
  { href: '/journal/', label: '公司新闻' },
  { href: '/press/', label: '社会报导' },
  { href: '/about/', label: '关于我们' },
] as const

/** 页头是否收起：停在最上端且页面可滚动时收起，向下滚动后滑出。 */
function useHeaderHidden() {
  // 初值 true 与 SSR 一致（预渲染 HTML 就是收起的），避免首帧闪动
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    let frame = 0

    const sync = () => {
      frame = 0
      setHidden(
        shouldHideHeader({
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
        }),
      )
    }

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(sync)
    }

    // 首帧同步一次：刷新页面时浏览器可能已经恢复到了某个滚动位置
    sync()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [])

  return hidden
}

export function Header() {
  const [open, setOpen] = useState(false)
  const [location] = useLocation()
  const hidden = useHeaderHidden()

  /** 前缀匹配：/journal/xxx/ 也让「公司新闻」保持高亮。 */
  const isActive = (href: string) => location.startsWith(href.replace(/\/$/, ''))

  return (
    // 停在最上端时收起（展开的移动端菜单除外——此时需要看着菜单操作）
    <HeaderBar $hidden={hidden && !open}>
      {/* 布局放在内层：页头本身是命名容器，容器不能查询自己 */}
      <HeaderBarInner>
        <Brand href="/" aria-label="聚核智算 FUSIM 首页">
          <BrandLogo />
        </Brand>

        <Nav $open={open}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} $active={isActive(item.href)}>
              {item.label}
            </NavLink>
          ))}
          <NavAnchor href="https://docs.fusim.cn/">产品文档</NavAnchor>
          <NavCta href="#contact" onClick={() => setOpen(false)}>
            预约合作
          </NavCta>
          <ThemeToggle placement="nav" />
        </Nav>

        <HeaderActions>
          <ThemeToggle placement="mobile" />
          <NavToggle
            type="button"
            aria-label={open ? '关闭导航' : '打开导航'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <Close /> : <Menu />}
          </NavToggle>
        </HeaderActions>
      </HeaderBarInner>
    </HeaderBar>
  )
}
