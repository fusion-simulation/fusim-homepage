import { useAttachmentStyles } from '../styles/publications'
import { DataTree } from '../components/DataTree'
import type { AttachmentDir } from '../lib/publication-types'

export function AttachmentDirPage({ dir }: { dir: AttachmentDir }) {
  const c = useAttachmentStyles()

  return (
    <div className={c.root}>
      <div className={c.inner}>
        <h1>📁 {dir.name}</h1>
        <a className={c.backLink} href={dir.parentUrl}>
          🔙 返回上一级或原文
        </a>
        <div className={c.card}>
          <DataTree nodes={dir.children} variant="attachment" />
        </div>
      </div>
    </div>
  )
}
