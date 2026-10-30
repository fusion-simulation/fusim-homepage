import { DataTree } from '../components/DataTree'
import type { AttachmentDir } from '../lib/publication-types'
import { AttachmentCard, AttachmentInner, AttachmentRoot, BackLink } from '../styles/publications'

export function AttachmentDirPage({ dir }: { dir: AttachmentDir }) {
  return (
    <AttachmentRoot>
      <AttachmentInner>
        <h1>📁 {dir.name}</h1>
        <BackLink href={dir.parentUrl}>🔙 返回上一级或原文</BackLink>
        <AttachmentCard>
          <DataTree nodes={dir.children} variant="attachment" />
        </AttachmentCard>
      </AttachmentInner>
    </AttachmentRoot>
  )
}
