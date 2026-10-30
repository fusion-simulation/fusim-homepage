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

/** webpack 的 context 模块（`import.meta.glob` 的等价物，见 src/lib/content.ts）。 */
declare interface ImportMeta {
  webpackContext(
    request: string,
    options: {
      recursive?: boolean
      regExp?: RegExp
      include?: RegExp
      exclude?: RegExp
      mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once'
      chunkName?: string
    },
  ): {
    (id: string): unknown
    keys(): string[]
    resolve(id: string): string
    id: string | number
  }
}
