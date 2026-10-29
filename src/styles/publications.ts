import { makeStyles } from '@griffel/react'

/** 论文附件文件树。 */
export const useDataTreeStyles = makeStyles({
  list: {
    listStyle: 'none',
    padding: 0,
    marginTop: '0.3rem',
  },

  item: {
    marginBottom: '0.2rem',
  },

  size: {
    marginLeft: '0.5rem',
    fontSize: '0.8em',
    color: 'var(--text-muted)',
  },

  /** 附件目录页使用固定的浅色配色，与原生成的静态页面一致。 */
  sizeOnAttachmentPage: {
    color: '#5b667a',
  },

  fileLinkOnAttachmentPage: {
    color: '#0056b3',
  },

  summary: {
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
    display: 'inline-block',
  },

  dirLink: {
    color: 'inherit',
    textDecoration: 'none',

    '&:hover': {
      textDecoration: 'underline',
    },
  },

  subtree: {
    paddingLeft: '1.5rem',
    marginTop: '0.2rem',
  },

  dataFiles: {
    marginTop: '0.5rem',
    fontSize: '0.9em',
  },
})

/** 论文附件目录页（`/assets/pub/.../`）。 */
export const useAttachmentStyles = makeStyles({
  root: {
    backgroundColor: '#fff',
    minHeight: '100vh',
    color: '#333',
    fontFamily: 'sans-serif',
    padding: '4rem 2rem',
  },

  inner: {
    maxWidth: '800px',
    margin: '0 auto',
  },

  backLink: {
    display: 'inline-block',
    marginBottom: '2rem',
    color: '#0056b3',
    textDecoration: 'none',
    fontWeight: 500,

    '&:hover': {
      textDecoration: 'underline',
    },
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
})
