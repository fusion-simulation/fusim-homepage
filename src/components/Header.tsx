import { mergeClasses } from '@griffel/react'
import { useState } from 'react'
import { Link } from 'wouter'
import { site } from '../content/site'
import { cx } from '../lib/cx'
import { useLayoutStyles } from '../styles/layout'
import { MenuIcon, MoonIcon, SunIcon, XIcon } from './Icons'

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

function ThemeToggle({ className }: { className: string }) {
  const c = useLayoutStyles()

  return (
    <button type="button" className={className} aria-label="切换主题" onClick={toggleTheme}>
      <SunIcon className={mergeClasses(c.themeIcon, 'theme-toggle-icon-light')} />
      <MoonIcon className={mergeClasses(c.themeIcon, 'theme-toggle-icon-dark')} />
    </button>
  )
}

export function Header() {
  const c = useLayoutStyles()
  const [open, setOpen] = useState(false)

  return (
    <header className={c.header}>
      <Link href="/" className={c.brand}>
        <span className={c.brandMark}>F</span>
        <span className={c.brandText}>
          <span>聚核智算</span>
          <span className={c.brandSub}>{site.slogan}</span>
        </span>
      </Link>

      {/* 导航的显示 / 隐藏依赖媒体查询，用 cx 拼接避免 mergeClasses 合并掉基础样式 */}
      <nav className={cx(c.nav, open ? c.navMobileOpen : c.navMobileClosed)}>
        <Link href="/journal/" className={c.navLink}>
          公司新闻
        </Link>
        <Link href="/press/" className={c.navLink}>
          社会报导
        </Link>
        <Link href="/products/" className={c.navLink}>
          产品矩阵
        </Link>
        <a href="https://docs.fusim.cn/" className={c.navLink}>
          产品文档
        </a>
        <Link href="/about/" className={c.navLink}>
          关于我们
        </Link>
        <a href="#contact" className={c.navLink}>
          预约合作
        </a>
        <ThemeToggle className={mergeClasses(c.themeToggle, c.themeToggleNav)} />
      </nav>

      <div className={c.headerActions}>
        <ThemeToggle className={mergeClasses(c.themeToggle, c.themeToggleMobile)} />
        <button
          type="button"
          className={c.navToggle}
          aria-label={open ? '关闭导航' : '打开导航'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <XIcon className={c.icon} /> : <MenuIcon className={c.icon} />}
        </button>
      </div>
    </header>
  )
}
