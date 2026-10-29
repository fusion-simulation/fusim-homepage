import { makeStyles } from '@griffel/react'

/** 站点内多处复用的样式：区块、卡片、按钮、入场动画等。 */
export const useSharedStyles = makeStyles({
  /* ---------- 区块 ---------- */
  section: {
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '80px 7vw',
    display: 'grid',
    gap: '32px',

    '& h2': {
      fontSize: 'clamp(2rem, 3vw, 2.8rem)',
      fontWeight: 600,
    },
    '& p': {
      color: 'var(--text-muted)',
      lineHeight: 1.7,
    },
    '& ul': {
      marginTop: '12px',
      paddingLeft: '18px',
      color: 'var(--text-muted)',
      lineHeight: 1.7,
    },
  },

  meta: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '8px',
  },

  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
  },

  card: {
    backgroundColor: 'var(--bg-soft)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    border: '1px solid var(--line)',

    '& h4': {
      marginBottom: '10px',
    },
  },

  split: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '28px',
  },

  quote: {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.4rem',
    lineHeight: 1.6,
    borderLeft: '2px solid var(--accent)',
    paddingLeft: '18px',
  },

  timeline: {
    display: 'grid',
    gap: '14px',
  },

  timelineItem: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr',
    gap: '18px',
    padding: '16px 0',
    borderBottom: '1px dashed rgba(255, 255, 255, 0.1)',

    '& span': {
      color: 'var(--text-muted)',
    },

    '@media (max-width: 960px)': {
      gridTemplateColumns: '1fr',
    },
  },

  heroTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid var(--line)',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    backgroundColor: 'var(--surface-translucent)',
  },

  /** 列表中日期标签的间距（原模板中的内联样式）。 */
  cardTag: {
    marginBottom: '12px',
  },

  /** 论文年份标题（原模板中的内联样式）。 */
  yearHeading: {
    fontSize: '1.6rem',
  },

  /* ---------- 按钮 ---------- */
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 22px',
    borderRadius: '10px',
    fontWeight: 600,
    lineHeight: 1.05,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',

    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },

  buttonPrimary: {
    backgroundColor: 'var(--accent)',
    color: '#0f1116',
    boxShadow: '0 20px 40px rgba(63, 109, 246, 0.18)',
  },

  buttonSecondary: {
    border: '1px solid var(--line)',
    color: 'var(--text)',
    backgroundColor: '#fff',
  },

  buttonAccent: {
    backgroundColor: 'var(--accent-2)',
    border: '1px solid var(--accent-2)',
    color: '#0f1116',
    boxShadow: '0 18px 32px rgba(79, 209, 197, 0.2)',
  },

  buttonLight: {
    backgroundColor: '#fff',
    color: '#1e2432',
    border: '1px solid rgba(30, 36, 50, 0.12)',
  },

  buttonIcon: {
    width: '16px',
    height: '16px',
    display: 'block',
  },

  /* ---------- 入场动画 ---------- */
  reveal: {
    opacity: 0,
    transform: 'translateY(12px)',
    animationName: 'fadeUp',
    animationDuration: '0.8s',
    animationTimingFunction: 'ease',
    animationFillMode: 'forwards',
  },

  delay1: { animationDelay: '0.15s' },
  delay2: { animationDelay: '0.3s' },
  delay3: { animationDelay: '0.45s' },
})
