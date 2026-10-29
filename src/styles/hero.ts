import { makeStyles } from '@griffel/react'

/** 首页 hero 与右侧 mock 面板。 */
export const useHeroStyles = makeStyles({
  hero: {
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: '110px 7vw 80px',
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '24px',

    '@media (max-width: 960px)': {
      gridTemplateColumns: '1fr',
    },
  },

  heroText: {
    gridColumn: 'span 7',

    '@media (max-width: 960px)': {
      gridColumn: 'span 1',
    },
  },

  heroTitle: {
    fontSize: 'clamp(2.8rem, 4vw, 4rem)',
    lineHeight: 1.1,
    margin: '24px 0 18px',
    fontWeight: 600,
  },

  heroDescription: {
    color: 'var(--text-muted)',
    fontSize: '1.1rem',
    lineHeight: 1.7,
    maxWidth: '520px',
  },

  heroActions: {
    marginTop: '28px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',

    '@media (max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },

  heroVisual: {
    gridColumn: 'span 5',
    position: 'relative',
    minHeight: '420px',

    '@media (max-width: 960px)': {
      gridColumn: 'span 1',
    },
  },

  mockFrame: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--line)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
    position: 'relative',
  },

  mockTopbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 18px',
    borderBottom: '1px solid var(--line)',
    backgroundColor: 'var(--surface-translucent)',
  },

  mockDot: {
    width: '10px',
    height: '10px',
    borderRadius: '4px',
    backgroundColor: 'var(--dot)',
  },

  mockTopbarText: {
    marginLeft: 'auto',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: 1.7,
    maxWidth: '520px',
  },

  mockBody: {
    padding: '24px',
    display: 'grid',
    gap: '20px',
  },

  mockMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
  },

  mockMetric: {
    padding: '14px 16px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--metric-bg)',
    border: '1px dashed var(--metric-border)',
  },

  mockMetricValue: {
    fontSize: '1.4rem',
  },

  mockMetricLabel: {
    color: 'var(--text-muted)',
    fontSize: '1.1rem',
    lineHeight: 1.7,
    maxWidth: '520px',
  },

  mockScreen: {
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(120deg, rgba(63, 109, 246, 0.2), rgba(79, 209, 197, 0.2))',
    padding: '24px',
    minHeight: '160px',
    border: '1px solid var(--line)',
  },

  mockGradient: {
    height: '80px',
    borderRadius: 'var(--radius-sm)',
    background: 'linear-gradient(120deg, rgba(63, 109, 246, 0.4), rgba(79, 209, 197, 0.3))',
  },

  mockLine: {
    height: '10px',
    backgroundColor: 'var(--bar)',
    marginTop: '12px',
    borderRadius: '6px',
  },

  mockLineShort: {
    width: '60%',
  },

  floatCard: {
    position: 'absolute',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '10px',
    padding: '16px 18px',
    border: '1px solid var(--line)',
    boxShadow: '0 18px 40px rgba(30, 36, 50, 0.15)',
  },

  floatCardLeft: {
    top: '-10px',
    left: '-30px',
    transform: 'rotate(-4deg)',
  },

  floatCardRight: {
    bottom: '30px',
    right: '-24px',
    transform: 'rotate(3deg)',
  },

  floatTitle: {
    fontWeight: 600,
    marginBottom: '10px',
    color: 'var(--text-muted)',
    fontSize: '1.1rem',
    lineHeight: 1.7,
    maxWidth: '520px',
  },

  floatRow: {
    height: '10px',
    width: '120px',
    backgroundColor: 'var(--bar)',
    borderRadius: '6px',
    marginBottom: '8px',
  },

  floatRowShort: {
    width: '80px',
  },

  floatTag: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px dashed rgba(63, 109, 246, 0.4)',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    marginRight: '6px',
  },
})
