import { styled } from 'styled-components'
import { responsiveImageAttributes } from '../lib/responsive-image'

type ResponsiveImageProps = {
  /** 源图 URL（构建管线会改写成 base `.webp`）。 */
  src: string
  /** 描述画面内容的替代文本，不用文件名。 */
  alt: string
  /** 固有宽度（像素），用于生成 `w` 描述符与 `width` 属性。 */
  width: number
  /** 固有高度（像素），与 `width` 一起固定宽高比，避免加载时抖动。 */
  height: number
  /** 展示上限（像素）：小图不放大，大图不撑破正文。 */
  displayWidth?: number
  /** 可选的可见图注。 */
  caption?: string
}

const Figure = styled.figure<{ $maxWidth: number }>`
  width: 100%;
  max-width: ${({ $maxWidth }) => `${$maxWidth}px`};
  /* 水平居中交给这里，垂直节奏交给正文的相邻元素间距 */
  margin-inline: auto;
  display: grid;
  justify-items: center;
  gap: 10px;
`

const Img = styled.img`
  display: block;
  width: 100%;
  height: auto;
`

/**
 * 正文内容图：输出 `srcSet` + `sizes="auto, 100vw"` + 固有宽高 + 懒加载，
 * 与构建期生成的多宽度 WebP 一一对应。所有值都是确定性计算，SSR 与客户端一致。
 */
export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  displayWidth,
  caption,
}: ResponsiveImageProps) {
  const attrs = responsiveImageAttributes(src, width)
  // 展示槽位不超过固有宽度：小图不被放大，大图按上限收窄
  const maxWidth = Math.min(displayWidth ?? width, width)

  return (
    <Figure $maxWidth={maxWidth}>
      <Img {...attrs} alt={alt} width={width} height={height} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </Figure>
  )
}
