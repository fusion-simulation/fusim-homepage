/**
 * 响应式图片的纯计算层：候选宽度、变体 URL、srcSet 与 <img> 属性。
 *
 * 构建期（WebP 变体生成）与运行时（组件 / SSR）共用这份候选宽度，
 * 保证生成的候选和标记里的 srcSet 永远对得上；所有函数都是纯字符串运算，
 * 不读浏览器 API，SSR 与客户端输出逐字一致。
 */

/** 正文图共享的候选宽度（升序）。构建期只生成小于源图宽度的变体。 */
export const IMAGE_VARIANT_WIDTHS = [480, 800, 1200, 1600] as const

/**
 * 把 `/a.webp` 映射成 `/a-480.webp`，目录与 query/hash 原样保留。
 *
 * 先切掉 query/hash 再找扩展名：`?v=1.2` 或 `#fig.2` 里的点不能被当成扩展名，
 * 目录里的点（`/v1.2/a.webp`）同理——扩展名必须落在最后一个 `/` 之后。
 */
export function imageVariantUrl(src: string, width: number): string {
  const tailAt = src.search(/[?#]/)
  const path = tailAt === -1 ? src : src.slice(0, tailAt)
  const tail = tailAt === -1 ? '' : src.slice(tailAt)

  const dot = path.lastIndexOf('.')
  if (dot <= path.lastIndexOf('/')) return src

  return `${path.slice(0, dot)}-${width}${path.slice(dot)}${tail}`
}

/**
 * 生成 `w` 描述符的 srcSet：先放小于源宽的候选（升序），
 * 再补一条原宽 base 兜底——800px 源图不会出现重复的 800w。
 */
export function buildResponsiveSrcSet(src: string, intrinsicWidth: number): string {
  const candidates = IMAGE_VARIANT_WIDTHS.filter((width) => width < intrinsicWidth).map(
    (width) => `${imageVariantUrl(src, width)} ${width}w`,
  )
  candidates.push(`${src} ${intrinsicWidth}w`)
  return candidates.join(', ')
}

export type ResponsiveImageAttributes = {
  src: string
  /** 构建期整组放弃时不存在候选文件，此时省略 srcSet / sizes。 */
  srcSet?: string
  sizes?: string
  loading: 'lazy'
  decoding: 'async'
}

/**
 * 正文图的属性契约：`sizes="auto, 100vw"` 让浏览器按真实槽位选图（旧浏览器回落 100vw），
 * 前提是图片必须 `loading="lazy"`，所以两者一起产出，不留给调用方拼错的机会。
 */
export function responsiveImageAttributes(
  src: string,
  intrinsicWidth: number,
): ResponsiveImageAttributes {
  // 构建期整组失败（变体名冲突 / 编码失败）时 loader 不会把 src 改写成 .webp，
  // 也就没有任何候选文件——只输出单张原图，绝不拼一个指向空气的 srcSet。
  if (!/\.webp(?:[?#]|$)/i.test(src)) {
    return { src, loading: 'lazy', decoding: 'async' }
  }

  return {
    src,
    srcSet: buildResponsiveSrcSet(src, intrinsicWidth),
    sizes: 'auto, 100vw',
    loading: 'lazy',
    decoding: 'async',
  }
}
