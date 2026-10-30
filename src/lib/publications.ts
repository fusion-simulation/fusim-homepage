import * as virtualPublications from 'virtual:publications'
import type { AttachmentDir, PublicationGroup } from './publication-types'

export type {
  AttachmentDir,
  PublicationDirNode,
  PublicationFileNode,
  PublicationGroup,
  PublicationItem,
  PublicationNode,
} from './publication-types'

/** 构建期扫描 `public/assets/pub` 得到的数据（见 webpack-plugins/publications.ts）。 */
export const publications: PublicationGroup[] = virtualPublications.publications
export const attachmentDirs: AttachmentDir[] = virtualPublications.attachmentDirs

export const attachmentDirByUrl = new Map(attachmentDirs.map((dir) => [dir.url, dir]))
