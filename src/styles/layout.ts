import { makeStyles } from '@griffel/react'

/** 页面框架：header / 内容区 / footer。 */
export const useLayoutStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },

  content: {
    flexGrow: 1,
  },

  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 7vw',
    backgroundColor: 'var(--header-bg)',
    backdropFilter: 'blur(18px)',
    borderBottom: '1px solid var(--line)',

    '@media (max-width: 960px)': {
      flexWrap: 'wrap',
      gap: '16px',
    },
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },

  brandMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
    color: '#0b0d12',
    fontWeight: 700,
  },

  brandText: {
    display: 'flex',
    flexDirection: 'column',
    fontWeight: 600,
  },

  brandSub: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },

  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    fontSize: '0.95rem',
    marginLeft: 'auto',
    justifyContent: 'flex-end',
  },

  navMobileOpen: {
    '@media (max-width: 960px)': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      width: '100%',
      gap: '12px',
      order: 2,
    },
  },

  navMobileClosed: {
    '@media (max-width: 960px)': {
      display: 'none',
      order: 2,
    },
  },

  navLink: {
    color: 'var(--text-muted)',
    transition: 'color 0.2s ease',

    '&:hover': {
      color: 'var(--text)',
    },
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',

    // 移动端保持「品牌 + 操作按钮」在第一行，导航展开后位于下方
    '@media (max-width: 960px)': {
      order: 1,
    },
  },

  themeToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    width: '36px',
    height: '36px',
    padding: 0,
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: '1px solid var(--line)',
    color: 'var(--text)',
  },

  themeToggleNav: {
    display: 'inline-flex',

    '@media (max-width: 960px)': {
      display: 'none',
    },
  },

  themeToggleMobile: {
    display: 'none',

    '@media (max-width: 960px)': {
      display: 'inline-flex',
    },
  },

  navToggle: {
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: 0,
    borderRadius: '999px',
    backgroundColor: 'transparent',
    border: '1px solid var(--line)',
    color: 'var(--text)',

    '@media (max-width: 960px)': {
      display: 'inline-flex',
    },
  },

  navToggleLabel: {
    display: 'none',
  },

  themeIcon: {
    width: '18px',
    height: '18px',
    display: 'block',
  },

  icon: {
    width: '18px',
    height: '18px',
    display: 'block',
  },

  footer: {
    marginTop: '80px',
    padding: '48px 7vw 60px',
    borderTop: '1px solid var(--line)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',

    '& h3': {
      fontSize: '1.8rem',
      marginBottom: '8px',
    },
  },

  footerMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
})
