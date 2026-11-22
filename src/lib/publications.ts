import * as virtualPublications from 'virtual:publications'
import type { PublicationGroup } from './publication-types'

export type { PublicationGroup, PublicationItem } from './publication-types'

/** 构建期扫描 `public/assets/pub` 得到的数据（见 webpack-plugins/publications.ts）。 */
export const publications: PublicationGroup[] = virtualPublications.publications
