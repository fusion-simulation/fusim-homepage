import { metaDescription } from '../content/product-matrix'
import { site } from '../content/site'
import { contentPageByUrl } from './content'

export type PageMeta = {
  title: string
  description: string
  /** 未知路径（404）为 false：客户端不写 canonical，并标 noindex。 */
  indexable: boolean
}

/** 与 Lume 各页面 frontmatter 中的 title / description 保持一致。 */
const staticMeta: Record<string, Omit<PageMeta, 'indexable'>> = {
  '/': {
    title: '聚核智算 FUSIM',
    description: site.description,
  },
  '/about/': {
    title: '关于我们 | 聚核智算 FUSIM',
    description: '了解聚核智算的公司定位、聚变仿真产品、工程服务与技术工作流。',
  },
  '/contact/': {
    title: '预约合作 | 聚核智算 FUSIM',
    description: '聚核智算业务合作、方案咨询与媒体联络方式。',
  },
  '/press/': {
    title: '企业动态 | 聚核智算 FUSIM',
    description: '聚核智算企业动态：科研进展、会议交流、荣誉奖项与媒体报道。',
  },
  '/products/': {
    title: '产品矩阵 | 聚核智算 FUSIM',
    description: metaDescription,
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

/** 静态页的站点路径（与 staticMeta 的键同源），预渲染路由全集的一部分。 */
export const staticRoutePaths: readonly string[] = Object.keys(staticMeta)

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

  const page = contentPageByUrl.get(url)
  if (page) {
    return {
      title: page.frontmatter.title ?? '聚核智算 FUSIM',
      description: page.frontmatter.description ?? site.description,
      indexable: true,
    }
  }

  const known = staticMeta[url]
  if (known) return { ...known, indexable: true }

  return { title: '404 | 聚核智算 FUSIM', description: site.description, indexable: false }
}
