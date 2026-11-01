import { css, styled } from 'styled-components'
import { Link } from 'wouter'
import { ExternalLinkIcon } from '../components/Icons'
import { type RevealProps, reveal } from './animation'

export { Reveal } from './animation'

/**
 * 站点级复用样式：全出血区块、容器、区块头、卡片、按钮、标签。
 * 只在单个页面里用一次的 styled 组件，直接写在页面文件里。
 */

/* ---------- 版式骨架：全出血 Band + 居中 Shell ---------- */

/** 全出血区块：负责节奏（留白、底色带），内容交给 Shell。 */
export const Band = styled.section<{ $tint?: boolean; $hairline?: boolean }>`
  position: relative;
  padding: 112px 0;
  scroll-margin-top: 72px;

  ${({ $tint }) =>
    $tint
      ? css`
          background:
            radial-gradient(900px 420px at 50% 0%, rgba(var(--accent-rgb), 0.05), transparent 70%),
            var(--bg-deep);
        `
      : ''}
  ${({ $hairline }) =>
    $hairline
      ? css`
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        `
      : ''}

  @media (max-width: 960px) {
    padding: 80px 0;
  }
`

/** 内容容器。 */
export const Shell = styled.div`
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 7vw;
`

export const ShellWide = styled.div`
  max-width: var(--max-width-wide);
  margin: 0 auto;
  padding: 0 7vw;
`

/** mono 眉题：SECTION KEY。 */
export const Eyebrow = styled.p`
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.28em;
  color: var(--accent-ink);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 12px;

  &::before {
    content: "";
    width: 28px;
    height: 1px;
    background: linear-gradient(90deg, var(--accent), transparent);
  }
`

/** 区块头：眉题 + 标题 + 描述，左对齐。 */
export const SectionHead = styled.div<RevealProps>`
  ${reveal}
  display: grid;
  gap: 18px;
  margin-bottom: 56px;
  max-width: 720px;

  & h2 {
    font-size: clamp(1.9rem, 3.2vw, 2.8rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.25;
  }

  & p {
    color: var(--text-muted);
    line-height: 1.8;
    font-size: 1.05rem;
  }
`

/* ---------- 内页通用 Section（保留给内容页） ---------- */

export const Section = styled.section`
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 72px 7vw;
  display: grid;
  gap: 32px;
  scroll-margin-top: 88px;

  & h2 {
    font-size: clamp(1.8rem, 2.8vw, 2.4rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  & h2::before {
    content: "";
    flex: none;
    width: 5px;
    height: 0.9em;
    background: linear-gradient(180deg, var(--accent), var(--accent-deep));
    box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.45);
  }

  & p {
    color: var(--text-muted);
    line-height: 1.8;
  }

  & ul {
    margin-top: 12px;
    padding-left: 18px;
    color: var(--text-muted);
    line-height: 1.8;
  }

  & ul li::marker {
    color: var(--accent-ink);
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
  position: relative;
  background-color: var(--bg-card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: var(--radius-md);
  padding: 26px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  /* 悬停：顶部浮现等离子体光带 */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--accent-deep), transparent);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
    box-shadow:
      var(--shadow-card),
      0 0 32px rgba(var(--accent-rgb), 0.14);
  }

  &:hover::before {
    opacity: 1;
  }

  & h4 {
    margin-bottom: 10px;
    font-size: 1.15rem;
    letter-spacing: 0.02em;
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
  font-size: 1.2rem;
  line-height: 1.7;
  border-left: 2px solid var(--accent);
  padding-left: 18px;
  letter-spacing: 0.02em;
  text-shadow: 0 0 24px rgba(var(--accent-rgb), 0.2);
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
  padding: 18px 0;
  border-bottom: 1px dashed var(--line-strong);

  & span {
    color: var(--accent-ink);
    font-family: var(--font-mono);
    font-size: 0.95rem;
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

export const HeroTag = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  background-color: var(--surface-translucent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  width: fit-content;

  /* 状态指示灯：45° 菱形 */
  &::before {
    content: "";
    width: 7px;
    height: 7px;
    transform: rotate(45deg);
    background: var(--accent);
    box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.9);
  }
`

/** 列表卡片顶部的日期标签。 */
export const CardTag = styled(HeroTag)`
  margin-bottom: 14px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
`

/** 论文年份标题。 */
export const YearHeading = styled.h3`
  font-size: 1.6rem;
  font-family: var(--font-mono);
  color: var(--accent-ink);
  letter-spacing: 0.08em;
`

/* ---------- 按钮 ---------- */
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'light'

/** 实底按钮的右上切角：锐利风签名细节（描边按钮不裁切，避免边框断口）。 */
const chamferCss = css`
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
`

const buttonVariants = {
  primary: css`
    background: linear-gradient(120deg, var(--accent), var(--accent-deep));
    color: #170322;
    box-shadow:
      0 14px 34px rgba(var(--accent-rgb), 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.35);
    ${chamferCss}

    &:hover {
      box-shadow:
        0 18px 44px rgba(var(--accent-rgb), 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }
  `,
  secondary: css`
    border: 1px solid var(--line-strong);
    color: var(--text);
    background-color: var(--surface-translucent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    &:hover {
      border-color: var(--accent);
      color: var(--accent-ink);
      box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.2);
    }
  `,
  accent: css`
    background: linear-gradient(120deg, var(--gold), var(--gold-deep));
    color: #170322;
    box-shadow:
      0 14px 34px rgba(var(--hl-rgb), 0.26),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
    ${chamferCss}

    &:hover {
      box-shadow:
        0 18px 44px rgba(var(--hl-rgb), 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
  `,
  light: css`
    border: 1px solid var(--line);
    color: var(--text-muted);
    background-color: transparent;

    &:hover {
      border-color: var(--line-strong);
      color: var(--text);
    }
  `,
}

const buttonCss = css<{ $variant: ButtonVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: 0.02em;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

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
