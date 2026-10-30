import { css, styled } from 'styled-components'
import { reveal, type RevealProps } from './animation'

/** 首页 hero 与右侧 mock 面板。 */

export const Hero = styled.section`
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 110px 7vw 80px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

export const HeroText = styled.div<RevealProps>`
  ${reveal}
  grid-column: span 7;

  @media (max-width: 960px) {
    grid-column: span 1;
  }
`

export const HeroTitle = styled.h1`
  font-size: clamp(2.8rem, 4vw, 4rem);
  line-height: 1.1;
  margin: 24px 0 18px;
  font-weight: 600;
`

export const HeroDescription = styled.p`
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 520px;
`

export const HeroActions = styled.div`
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

export const HeroVisual = styled.aside<RevealProps>`
  ${reveal}
  grid-column: span 5;
  position: relative;
  min-height: 420px;

  @media (max-width: 960px) {
    grid-column: span 1;
  }
`

export const MockFrame = styled.div`
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  overflow: hidden;
  position: relative;
`

export const MockTopbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background-color: var(--surface-translucent);
`

export const MockDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 4px;
  background-color: var(--dot);
`

export const MockTopbarText = styled.p`
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.7;
  max-width: 520px;
`

export const MockBody = styled.div`
  padding: 24px;
  display: grid;
  gap: 20px;
`

export const MockMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
`

export const MockMetric = styled.div`
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background-color: var(--metric-bg);
  border: 1px dashed var(--metric-border);
`

export const MockMetricValue = styled.strong`
  font-size: 1.4rem;
`

export const MockMetricLabel = styled.p`
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 520px;
`

export const MockScreen = styled.div`
  border-radius: var(--radius-md);
  background: linear-gradient(120deg, rgba(63, 109, 246, 0.2), rgba(79, 209, 197, 0.2));
  padding: 24px;
  min-height: 160px;
  border: 1px solid var(--line);
`

export const MockGradient = styled.div`
  height: 80px;
  border-radius: var(--radius-sm);
  background: linear-gradient(120deg, rgba(63, 109, 246, 0.4), rgba(79, 209, 197, 0.3));
`

export const MockLine = styled.div<{ $short?: boolean }>`
  height: 10px;
  background-color: var(--bar);
  margin-top: 12px;
  border-radius: 6px;
  ${({ $short }) => ($short ? 'width: 60%;' : '')}
`

const floatCardCss = css`
  position: absolute;
  background-color: var(--bg-card);
  border-radius: 10px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  box-shadow: 0 18px 40px rgba(30, 36, 50, 0.15);
`

export const FloatCard = styled.div<{ $side: 'left' | 'right' }>`
  ${floatCardCss}
  ${({ $side }) =>
    $side === 'left'
      ? css`
          top: -10px;
          left: -30px;
          transform: rotate(-4deg);
        `
      : css`
          bottom: 30px;
          right: -24px;
          transform: rotate(3deg);
        `}
`

export const FloatTitle = styled.p`
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 520px;
`

export const FloatRow = styled.div<{ $short?: boolean }>`
  height: 10px;
  width: ${({ $short }) => ($short ? '80px' : '120px')};
  background-color: var(--bar);
  border-radius: 6px;
  margin-bottom: 8px;
`

export const FloatTag = styled.div`
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(63, 109, 246, 0.4);
  color: var(--text-muted);
  font-size: 0.75rem;
  margin-right: 6px;
`
