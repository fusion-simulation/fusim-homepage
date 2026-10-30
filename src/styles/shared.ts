import { css, styled } from 'styled-components'
import { Link } from 'wouter'
import { ExternalLinkIcon } from '../components/Icons'
import { type RevealProps, reveal } from './animation'

export { Reveal } from './animation'

/**
 * 站点级复用样式：区块、卡片、按钮、标签、时间线。
 * 只在单个页面里用一次的 styled 组件，直接写在页面文件里。
 */

/* ---------- 区块 ---------- */
export const Section = styled.section`
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 80px 7vw;
  display: grid;
  gap: 32px;

  & h2 {
    font-size: clamp(2rem, 3vw, 2.8rem);
    font-weight: 600;
  }

  & p {
    color: var(--text-muted);
    line-height: 1.7;
  }

  & ul {
    margin-top: 12px;
    padding-left: 18px;
    color: var(--text-muted);
    line-height: 1.7;
  }
`

export const Meta = styled.p`
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 8px;
`

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
`

const cardCss = css`
  background-color: var(--bg-soft);
  border-radius: var(--radius-md);
  padding: 24px;
  border: 1px solid var(--line);

  & h4 {
    margin-bottom: 10px;
  }
`

export const Card = styled.div<RevealProps>`
  ${cardCss}
  ${reveal}
`

/** 产品卡片：内部路由。 */
export const CardLink = styled(Link)<RevealProps>`
  ${cardCss}
  ${reveal}
`

/** 产品卡片：外链。 */
export const CardAnchor = styled.a<RevealProps>`
  ${cardCss}
  ${reveal}
`

export const Split = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
`

export const Quote = styled.p`
  font-family: var(--font-serif);
  font-size: 1.4rem;
  line-height: 1.6;
  border-left: 2px solid var(--accent);
  padding-left: 18px;
`

export const Timeline = styled.div`
  display: grid;
  gap: 14px;
`

export const TimelineItem = styled.div<RevealProps>`
  ${reveal}
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 18px;
  padding: 16px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);

  & span {
    color: var(--text-muted);
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

export const HeroTag = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 0.9rem;
  background-color: var(--surface-translucent);
`

/** 列表卡片顶部的日期标签。 */
export const CardTag = styled(HeroTag)`
  margin-bottom: 12px;
`

/** 论文年份标题。 */
export const YearHeading = styled.h3`
  font-size: 1.6rem;
`

/* ---------- 按钮 ---------- */
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'light'

const buttonVariants = {
  primary: css`
    background-color: var(--accent);
    color: #0f1116;
    box-shadow: 0 20px 40px rgba(63, 109, 246, 0.18);
  `,
  secondary: css`
    border: 1px solid var(--line);
    color: var(--text);
    background-color: #fff;
  `,
  accent: css`
    background-color: var(--accent-2);
    border: 1px solid var(--accent-2);
    color: #0f1116;
    box-shadow: 0 18px 32px rgba(79, 209, 197, 0.2);
  `,
  light: css`
    background-color: #fff;
    color: #1e2432;
    border: 1px solid rgba(30, 36, 50, 0.12);
  `,
}

const buttonCss = css<{ $variant: ButtonVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 22px;
  border-radius: 10px;
  font-weight: 600;
  line-height: 1.05;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  ${({ $variant }) => buttonVariants[$variant]}
`

export const BtnLink = styled(Link)<{ $variant: ButtonVariant }>`
  ${buttonCss}
`

export const BtnAnchor = styled.a<{ $variant: ButtonVariant }>`
  ${buttonCss}
`

export const ButtonIcon = styled(ExternalLinkIcon)`
  width: 16px;
  height: 16px;
  display: block;
`

/** 居中/留白用的按钮行（原 NotFoundPage 的内联 marginTop）。 */
export const ButtonRow = styled.p`
  margin-top: 24px;
`
