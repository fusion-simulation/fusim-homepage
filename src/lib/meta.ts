import { site } from '../content/site'
import { contentPageByUrl } from './content'
import { attachmentDirByUrl } from './publications'

export type PageMeta = {
  title: string
  description: string
}

/** 与 Lume 各页面 frontmatter 中的 title / description 保持一致。 */
const staticMeta: Record<string, PageMeta> = {
  '/': {
    title: '聚核智算 FUSIM',
    description: site.description,
  },
  '/about/': {
    title: '企业介绍 | 聚核智算 FUSIM',
    description: '聚核智算企业介绍、核心能力与服务架构。',
  },
  '/journal/': {
    title: '企业新闻 | 聚核智算 FUSIM',
    description: '聚核智算企业日志列表，记录产品演进、技术洞察与行业观点。',
  },
  '/press/': {
    title: '社会报导 | 聚核智算 FUSIM',
    description: '聚核智算媒体报导与社会关注。',
  },
  '/products/': {
    title: '产品矩阵 | 聚核智算 FUSIM',
    description: '聚核智算产品矩阵，覆盖算力供给、平台管理与行业智能。',
  },
  '/publications/': {
    title: '论文发表 | 聚核智算 FUSIM',
    description: '聚核智算论文与技术报告归档。',
  },
  '/responsibility/': {
    title: '企业责任 | 聚核智算 FUSIM',
    description: '聚核智算企业责任与可持续实践。',
  },
}

/** 统一成以 `/` 开头、以 `/` 结尾的站点路径。 */
export function normalizePath(pathname: string): string {
  const [raw] = pathname.split(/[?#]/)
  let path = raw || '/'

  if (!path.startsWith('/')) path = `/${path}`
  if (!path.endsWith('/')) path = `${path}/`

  return path.replace(/\/{2,}/g, '/')
}

export function resolveMeta(pathname: string): PageMeta {
  const url = normalizePath(pathname)

  const attachmentDir = attachmentDirByUrl.get(url)
  if (attachmentDir) {
    return {
      title: `附件目录：${attachmentDir.name} | 聚核智算 FUSIM`,
      description: site.description,
    }
  }

  const page = contentPageByUrl.get(url)
  if (page) {
    return {
      title: page.frontmatter.title ?? '聚核智算 FUSIM',
      description: page.frontmatter.description ?? site.description,
    }
  }

  return staticMeta[url] ?? { title: '404 | 聚核智算 FUSIM', description: site.description }
}

export type StaticPath = PageMeta & { url: string }

/** 构建期需要预渲染的全部页面。 */
export function getStaticPaths(): StaticPath[] {
  const paths = new Map<string, PageMeta>()

  for (const [url, meta] of Object.entries(staticMeta)) paths.set(url, meta)
  for (const page of contentPageByUrl.keys()) paths.set(page, resolveMeta(page))
  for (const dir of attachmentDirByUrl.keys()) paths.set(dir, resolveMeta(dir))

  return [...paths.entries()]
    .map(([url, meta]) => ({ url, ...meta }))
    .sort((a, b) => a.url.localeCompare(b.url))
}
