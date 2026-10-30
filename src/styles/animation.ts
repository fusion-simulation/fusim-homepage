import { css, keyframes, styled } from 'styled-components'

/** 入场动画：元素从下方 12px 淡入。 */
export const fadeUp = keyframes`
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

export type RevealProps = {
  /** 0–3，对应 0 / 0.15 / 0.3 / 0.45s 的级联延迟。 */
  $delay?: number
}

/**
 * 入场动画片段：任何需要 reveal 的样式组件都用 `${reveal}` 引入，
 * 并通过 `$delay` 控制级联顺序。
 */
export const reveal = css<RevealProps>`
  opacity: 0;
  transform: translateY(12px);
  animation: ${fadeUp} 0.8s ease forwards;
  animation-delay: ${({ $delay = 0 }) => `${$delay * 0.15}s`};
`

/** 直接包一层 div 的入场动画（用于标题、段落这类不需要额外样式的容器）。 */
export const Reveal = styled.div<RevealProps>`
  ${reveal}
`
