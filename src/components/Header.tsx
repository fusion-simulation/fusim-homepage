import { useState } from 'react'
import { styled } from 'styled-components'
import { site } from '../content/site'
import {
  Brand,
  BrandMark,
  BrandSub,
  BrandText,
  HeaderActions,
  HeaderBar,
  iconCss,
  Nav,
  NavAnchor,
  NavLink,
  NavToggle,
  ThemeButton,
} from '../styles/layout'
import { MenuIcon, MoonIcon, SunIcon, XIcon } from './Icons'

const LightIcon = styled(SunIcon)`
  ${iconCss}
  html[data-theme="dark"] & {
    display: none;
  }
`

const DarkIcon = styled(MoonIcon)`
  ${iconCss}
  display: none;
  html[data-theme="dark"] & {
    display: block;
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

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <HeaderBar>
      <Brand href="/">
        <BrandMark>F</BrandMark>
        <BrandText>
          <span>聚核智算</span>
          <BrandSub>{site.slogan}</BrandSub>
        </BrandText>
      </Brand>

      <Nav $open={open}>
        <NavLink href="/journal/">公司新闻</NavLink>
        <NavLink href="/press/">社会报导</NavLink>
        <NavLink href="/products/">产品矩阵</NavLink>
        <NavAnchor href="https://docs.fusim.cn/">产品文档</NavAnchor>
        <NavLink href="/about/">关于我们</NavLink>
        <NavAnchor href="#contact">预约合作</NavAnchor>
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
