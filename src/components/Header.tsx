import { useState } from 'react'
import { styled } from 'styled-components'
import { useLocation } from 'wouter'
import {
  Brand,
  BrandLogo,
  HeaderActions,
  HeaderBar,
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

function toggleTheme() {
  const root = document.documentElement
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next

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

export function Header() {
  const [open, setOpen] = useState(false)
  const [location] = useLocation()

  /** 前缀匹配：/journal/xxx/ 也让「公司新闻」保持高亮。 */
  const isActive = (href: string) => location.startsWith(href.replace(/\/$/, ''))

  return (
    <HeaderBar>
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
    </HeaderBar>
  )
}
