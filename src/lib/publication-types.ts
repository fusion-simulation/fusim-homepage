/**
 * 论文附件（`public/assets/pub`）扫描结果的共享类型。
 * 由构建期插件生成、同时在 React 页面中使用。
 */

export type PublicationFileNode = {
  type: 'file'
  name: string
  url: string
  sizeStr: string
}

export type PublicationDirNode = {
  type: 'dir'
  name: string
  url: string
  children: PublicationNode[]
}

export type PublicationNode = PublicationFileNode | PublicationDirNode

export type PublicationItem = {
  url: string
  title: string
  meta: string
  data: PublicationNode[]
}

export type PublicationGroup = {
  year: string
  items: PublicationItem[]
}

export type AttachmentDir = {
  url: string
  name: string
  parentUrl: string
  children: PublicationNode[]
}

export type PublicationsData = {
  publications: PublicationGroup[]
  attachmentDirs: AttachmentDir[]
}
