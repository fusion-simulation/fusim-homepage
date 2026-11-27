/**
 * 企业动态的标签计数与筛选：抽成纯函数，好在 node --test 里直接验证，
 * SSR 与客户端共用同一份逻辑（与 `src/lib/nav.ts` 同一动机）。
 *
 * 刻意不 import `src/lib/content.ts`：那边靠 `import.meta.webpackContext` 收集 MDX，
 * 是 webpack 才认得的虚拟模块，`node --test` 直接跑不动。这里只声明结构约束，
 * `ContentPage` 天然满足。
 */

/** 只用到 frontmatter.tags 的最小结构约束。 */
export type Tagged = { frontmatter: { tags?: readonly string[] } }

/** 一个标签及其文章数。 */
export type TagCount = { tag: string; count: number }

/** 按篇数降序；篇数相同时保持首次出现的顺序（`Array#sort` 稳定）。 */
export function collectTags<T extends Tagged>(pages: readonly T[]): TagCount[] {
  const counts = new Map<string, number>()

  for (const page of pages) {
    for (const tag of page.frontmatter.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/** `tag` 为 null / 空串时返回全量；未知标签返回空列表。 */
export function filterByTag<T extends Tagged>(pages: readonly T[], tag: string | null): T[] {
  if (!tag) return [...pages]

  return pages.filter((page) => page.frontmatter.tags?.includes(tag))
}

/** 从 `?tag=…` 这样的 search 里取标签，缺失或空值都归一成 null。 */
export function parseTag(search: string): string | null {
  return new URLSearchParams(search).get('tag') || null
}
