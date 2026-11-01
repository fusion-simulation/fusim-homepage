import { styled } from 'styled-components'
import { type RevealProps, reveal, scrollLine } from './animation'

/** 首页全屏 Hero：背景等离子体场景 + 居中大标题 + 底部数据带。 */

export const HeroStage = styled.section`
  position: relative;
  /* 扣除 sticky header 的高度，数据带恰好收在首屏底缘 */
  min-height: calc(100svh - var(--header-h));
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

/** 背景：大尺寸托卡马克场景，径向遮罩淡出边缘。 */
export const HeroBackdrop = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;

  & > svg {
    width: min(118vh, 1080px);
    height: auto;
    opacity: 0.8;
    -webkit-mask-image: radial-gradient(circle at 50% 44%, black 30%, transparent 72%);
    mask-image: radial-gradient(circle at 50% 44%, black 30%, transparent 72%);
  }

  @media (max-width: 960px) {
    & > svg {
      width: 150vw;
      opacity: 0.4;
    }
  }
`

export const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0;
  padding: 132px 7vw 150px;
`

export const HeroEyebrow = styled.p<RevealProps>`
  ${reveal}
  font-family: var(--font-mono);
  font-size: 0.82rem;
  letter-spacing: 0.34em;
  color: var(--accent-ink);
  display: inline-flex;
  align-items: center;
  gap: 14px;

  &::before,
  &::after {
    content: "";
    width: 36px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent));
  }

  &::after {
    background: linear-gradient(90deg, var(--accent), transparent);
  }
`

export const HeroTitle = styled.h1<RevealProps>`
  ${reveal}
  /* 2.35rem 保证 390px 宽下「打造聚变堆系统的」8 字不断行 */
  font-size: clamp(2.35rem, 6.4vw, 5.4rem);
  line-height: 1.14;
  margin: 30px 0 26px;
  font-weight: 700;
  letter-spacing: 0.03em;
  max-width: 20em;

  /* 第二行「数字孪生设施」用主色纯色强调（不用渐变字） */
  & em {
    display: block;
    font-style: normal;
    color: var(--accent-ink);
    text-shadow: 0 0 32px rgba(var(--accent-rgb), 0.35);
  }
`

export const HeroLead = styled.p<RevealProps>`
  ${reveal}
  color: var(--text-muted);
  font-size: clamp(1rem, 1.4vw, 1.15rem);
  line-height: 1.9;
  max-width: 620px;
`

export const HeroActions = styled.div<RevealProps>`
  ${reveal}
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    width: min(360px, 100%);
  }
`

/** 底部数据带：全宽、发丝线上边框、玻璃底。 */
export const HeroStatBar = styled.div<RevealProps>`
  ${reveal}
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--line);
  background: var(--surface-translucent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  & > div {
    max-width: var(--max-width-wide);
    margin: 0 auto;
    padding: 0 7vw;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 760px) {
    & > div {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`

export const HeroStat = styled.div`
  padding: 22px 20px;
  text-align: center;
  display: grid;
  gap: 4px;
  position: relative;

  /* 列间细分隔线 */
  &:not(:first-child)::before {
    content: "";
    position: absolute;
    left: 0;
    top: 24%;
    bottom: 24%;
    width: 1px;
    background: var(--line);
  }

  @media (max-width: 760px) {
    &:nth-child(3)::before {
      display: none;
    }
  }
`

export const HeroStatValue = styled.strong`
  font-size: clamp(1.4rem, 2.2vw, 1.9rem);
  font-weight: 700;
  font-family: var(--font-sans);
  letter-spacing: 0.02em;
  color: var(--text);

  & small {
    font-size: 0.55em;
    font-weight: 500;
    color: var(--accent-ink);
    margin-left: 4px;
    letter-spacing: 0.08em;
  }
`

export const HeroStatLabel = styled.p`
  color: var(--text-muted);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
`

/** 滚动提示。 */
export const ScrollCue = styled.div<RevealProps>`
  ${reveal}
  position: absolute;
  z-index: 1;
  left: 50%;
  bottom: 132px;
  transform: translateX(-50%);
  display: grid;
  justify-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.32em;

  &::after {
    content: "";
    width: 1px;
    height: 34px;
    background: linear-gradient(180deg, var(--accent), transparent);
    animation: ${scrollLine} 2.4s ease-in-out infinite;
  }

  @media (max-width: 960px) {
    display: none;
  }
`
