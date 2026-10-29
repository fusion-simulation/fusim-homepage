/// <reference types="vite/client" />

declare module 'virtual:publications' {
  import type { AttachmentDir, PublicationGroup } from '../lib/publication-types'

  export const publications: PublicationGroup[]
  export const attachmentDirs: AttachmentDir[]
}

declare module '*.mdx' {
  import type { ComponentType } from 'react'

  const MDXContent: ComponentType

  export default MDXContent
  export const frontmatter: Record<string, unknown>
}
