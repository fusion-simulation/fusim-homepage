import { styled } from 'styled-components'
import { corePulse, scenePulse, sceneSpin, sceneSpinFast } from '../styles/animation'

/** 托卡马克场景专用样式：旋转/脉动组以 styled 包装接入 SVG 关键帧。 */

export const SceneSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
`

export const SpinGroup = styled.g`
  ${sceneSpin}
`

export const SweepGroup = styled.g`
  ${sceneSpinFast}
`

export const PulseGroup = styled.g`
  ${scenePulse}
`

/** 磁轴亮点：叠加辉光呼吸。 */
export const AxisDot = styled.circle`
  animation: ${corePulse} 3.2s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
`

/** 托卡马克极向截面（D 形位形）：单条路径按比例缩放得到嵌套磁面。 */
const FLUX_PATH =
  'M 265 135 C 355 148 405 210 405 280 C 405 350 355 412 265 425 C 215 418 182 350 182 280 C 182 210 215 142 265 135 Z'

/** 磁面缩放：以环心 (280, 280) 为基准的嵌套等比面。 */
const fluxScales = [1, 0.78, 0.58, 0.4]

/**
 * 托卡马克等离子体平衡位形示意：嵌套磁面、旋转诊断弧、雷达扫描线与脉动磁轴。
 * 纯 SVG + CSS 动画；尺寸与透明度由使用方的容器决定。
 */
export function TokamakScene() {
  return (
    <SceneSvg
      viewBox="0 0 560 560"
      role="img"
      aria-label="托卡马克等离子体平衡位形示意：嵌套磁面与旋转诊断环"
    >
      <defs>
        {/* 核心辉光只留一层很淡的蓝雾：它正好在标题背后，浓一点就会把字压花 */}
        <radialGradient id="fs-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.18 }} />
          <stop offset="22%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.12 }} />
          <stop offset="48%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.05 }} />
          <stop offset="78%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.02 }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id="fs-flux" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent-deep)' }} />
        </linearGradient>
        <linearGradient id="fs-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent-ink)' }} />
        </linearGradient>
      </defs>

      {/* 外围 HUD 刻度环（静态） */}
      <circle cx="280" cy="280" r="252" fill="none" stroke="var(--line)" strokeDasharray="2 10" />
      <circle cx="280" cy="280" r="216" fill="none" stroke="var(--line)" opacity="0.7" />
      {/* 四个方位刻度 */}
      <g stroke="var(--line-strong)" strokeWidth="2">
        <path d="M 280 18 v 14 M 280 528 v 14 M 18 280 h 14 M 528 280 h 14" />
      </g>

      {/* 旋转的诊断弧线 */}
      <SpinGroup>
        <circle
          cx="280"
          cy="280"
          r="252"
          fill="none"
          stroke="url(#fs-arc)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="90 580"
          opacity="0.85"
        />
        <circle
          cx="280"
          cy="280"
          r="234"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="40 700"
          opacity="0.5"
        />
      </SpinGroup>

      {/* 雷达扫描线 */}
      <SweepGroup opacity="0.55">
        <path d="M 280 280 L 280 30" stroke="var(--accent)" strokeWidth="1.5" />
        <circle cx="280" cy="30" r="4" fill="var(--accent)" />
      </SweepGroup>

      {/* 嵌套磁面 */}
      <g fill="none" stroke="url(#fs-flux)">
        {fluxScales.map((scale, index) => (
          <path
            key={scale}
            d={FLUX_PATH}
            transform={`translate(280 280) scale(${scale}) translate(-280 -280)`}
            strokeWidth={1.6}
            opacity={0.28 + index * 0.22}
          />
        ))}
      </g>
      {/* 最内闭合磁面：金色描边，呼应品牌金 */}
      <path
        d={FLUX_PATH}
        transform="translate(280 280) scale(0.24) translate(-280 -280)"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.8"
        opacity="0.9"
      />

      {/* 等离子体核心：呼吸脉动的辉光 */}
      <PulseGroup>
        <circle cx="280" cy="280" r="86" fill="url(#fs-core)" />
        <circle cx="280" cy="280" r="44" fill="url(#fs-core)" />
      </PulseGroup>
      <AxisDot cx="280" cy="280" r="5" fill="var(--text)" />

      {/* 环向运行的粒子 */}
      <SweepGroup>
        <circle cx="280" cy="46" r="3.5" fill="var(--gold)" />
      </SweepGroup>
      <SpinGroup>
        <circle cx="510" cy="280" r="3" fill="var(--accent)" />
      </SpinGroup>
    </SceneSvg>
  )
}
