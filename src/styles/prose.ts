import { makeStyles } from '@griffel/react'

/** 正文（MDX）排版，对应原模板中的 `.prose`。 */
export const useProseStyles = makeStyles({
  prose: {
    '& > * + *': {
      marginTop: '14px',
    },

    '& h1': {
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      fontSize: 'clamp(2rem, 3vw, 2.6rem)',
      marginTop: 0,
    },
    '& h2': {
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      fontSize: '1.6rem',
      marginTop: '26px',
    },
    '& h3': {
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      fontSize: '1.25rem',
      marginTop: '22px',
    },
    '& h4': {
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },

    '& p': {
      color: 'var(--text-muted)',
      lineHeight: 1.8,
    },

    '& a': {
      color: 'var(--accent)',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },
    '& a:hover': {
      textDecorationThickness: '2px',
    },

    '& ul': {
      paddingLeft: '1.2rem',
      color: 'var(--text-muted)',
      lineHeight: 1.8,
    },
    '& ol': {
      paddingLeft: '1.2rem',
      color: 'var(--text-muted)',
      lineHeight: 1.8,
    },
    '& li + li': {
      marginTop: '6px',
    },

    '& blockquote': {
      borderLeft: '2px solid var(--accent)',
      paddingLeft: '16px',
      color: 'var(--text-muted)',
    },

    '& code': {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.95em',
      backgroundColor: 'rgba(63, 109, 246, 0.12)',
      padding: '0.12em 0.35em',
      borderRadius: '6px',
    },

    '& pre': {
      backgroundColor: 'var(--bg-soft)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      overflow: 'auto',
    },
    '& pre code': {
      backgroundColor: 'transparent',
      padding: 0,
      borderRadius: 0,
    },
  },

  proseBox: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '72px 7vw 20px',
  },

  /** 原 `service_*.md` 中 `<style>` 的宽度覆盖。 */
  proseBoxWide: {
    maxWidth: '2400px',
    margin: '0 auto',
    padding: '72px 20px 20px',
  },

  proseCard: {
    backgroundColor: 'var(--bg-soft)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-lg)',
    padding: '34px',
    boxShadow: 'var(--prose-shadow)',

    '& > :first-child': {
      marginTop: 0,
    },
  },
})
