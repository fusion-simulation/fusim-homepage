import type { ComponentType } from 'react'

/** MDX frontmatter：只保留页面渲染 / 排序真正需要的字段。 */
export type Frontmatter = {
  title?: string
  description?: string
  order?: number
  desp?: string
  external_url?: string
  /** 历史字段（原 `service_*.md` 的宽版正文标记）。正文列现已统一为阅读宽度，渲染不再读取它。 */
  wide?: boolean
  product_section?: string
  section_key?: string
  date?: string
}

/** 内容类型由所在目录决定，无需在 frontmatter 里重复声明。 */
export type ContentKind = 'page' | 'product' | 'product_section' | 'journal'

export type ContentPage = {
  /** 站点路径，统一以 `/` 结尾（与 Lume 的 page.url 一致）。 */
  url: string
  /** 源文件相对 `src/content` 的路径。 */
  file: string
  kind: ContentKind
  frontmatter: Frontmatter
  Component: ComponentType
}

type MdxModule = {
  default: ComponentType
  frontmatter?: Frontmatter
}

/**
 * 同步收集 `src/content` 下全部 MDX：webpack 的 context 模块在编译期展开成静态依赖，
 * 键是 `./products/x.mdx` 这样的相对路径（Vite 的 `import.meta.glob` 在同一位置的替代）。
 */
const contentContext = import.meta.webpackContext('../content', {
  recursive: true,
  regExp: /\.mdx$/,
})

const modules: Record<string, MdxModule> = Object.fromEntries(
  contentContext.keys().map((key) => [key, contentContext(key) as MdxModule]),
)

/** 统一成相对 `src/content` 的路径，页面类型与 URL 都按它判断。 */
function relativePath(file: string): string {
  return file.replace(/^\.\//, '')
}

function toUrl(file: string): string {
  const bare = relativePath(file).replace(/\.mdx$/, '')
  const path = bare.endsWith('/index') ? bare.slice(0, -'index'.length) : `${bare}/`
  return `/${path}`.replace(/\/{2,}/g, '/')
}

function toKind(file: string): ContentKind {
  const path = relativePath(file)

  if (path.startsWith('journal/')) return 'journal'
  if (path.startsWith('products/sections/')) return 'product_section'
  if (path.startsWith('products/')) return 'product'

  return 'page'
}

/** 所有 MDX 内容页（products / journal / ...）。 */
export const contentPages: ContentPage[] = Object.entries(modules)
  .map(([file, mod]) => ({
    url: toUrl(file),
    file,
    kind: toKind(file),
    frontmatter: mod.frontmatter ?? {},
    Component: mod.default,
  }))
  .sort((a, b) => a.url.localeCompare(b.url))

export const contentPageByUrl = new Map(contentPages.map((page) => [page.url, page]))

export const productSections = contentPages
  .filter((page) => page.kind === 'product_section')
  .sort((a, b) => (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0))

export const products = contentPages
  .filter((page) => page.kind === 'product')
  .sort((a, b) => (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0))

export function productsOfSection(sectionKey: string | undefined): ContentPage[] {
  return products.filter((page) => page.frontmatter.product_section === sectionKey)
}

export const journalPages = contentPages
  .filter((page) => page.kind === 'journal')
  .sort((a, b) => (b.frontmatter.date ?? '').localeCompare(a.frontmatter.date ?? ''))
