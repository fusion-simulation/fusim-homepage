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

/* ---------- 场景动画（首页托卡马克视觉 / 浮动标签） ---------- */

/** HUD 环缓慢旋转（SVG 组配合 transform-box: view-box 使用）。 */
export const spinSlow = keyframes`
  to {
    transform: rotate(360deg);
  }
`

/** 等离子体核心呼吸脉动。 */
export const corePulse = keyframes`
  0%,
  100% {
    opacity: 0.75;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
`

/** 浮动标签上下漂浮。 */
export const floatY = keyframes`
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
`

/** 合作单位跑马灯：向左无限滚动（内容需复制一份实现无缝衔接）。 */
export const marquee = keyframes`
  to {
    transform: translateX(-50%);
  }
`

/** 滚动提示竖线：向下生长后淡出。 */
export const scrollLine = keyframes`
  0% {
    transform: scaleY(0);
    transform-origin: top;
  }
  45% {
    transform: scaleY(1);
    transform-origin: top;
  }
  55% {
    transform: scaleY(1);
    transform-origin: bottom;
  }
  100% {
    transform: scaleY(0);
    transform-origin: bottom;
  }
`

/**
 * SVG 场景组共用：以 viewBox 中心为旋转原点。
 * 浏览器对 transform-origin: 50% 50% + transform-box: view-box 的支持已足够。
 */
export const sceneSpin = css`
  transform-box: view-box;
  transform-origin: 50% 50%;
  animation: ${spinSlow} 90s linear infinite;
`

export const sceneSpinFast = css`
  transform-box: view-box;
  transform-origin: 50% 50%;
  animation: ${spinSlow} 14s linear infinite;
`

export const scenePulse = css`
  transform-box: view-box;
  transform-origin: 50% 50%;
  animation: ${corePulse} 5s ease-in-out infinite;
`
