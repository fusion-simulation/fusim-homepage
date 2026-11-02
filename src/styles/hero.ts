import { styled } from 'styled-components'
import { type RevealProps, reveal, scrollLine } from './animation'
import { container, containers, fromContainer } from './responsive'

/** 首页全屏 Hero：背景等离子体场景 + 居中大标题 + 底部数据带。 */

export const HeroStage = styled.section`
  ${container(containers.hero)}
  position: relative;
  /* 首屏铺满一屏：页头已改 fixed 不再占位，不必再扣 --header-h；
     数据带已移到 section 之外，落在折叠线以下。
     svh 兜住移动端地址栏，避免首屏被地址栏截掉一块 */
  min-height: 100vh;
  min-height: 100svh;
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

  /* 窄首屏：场景放大铺满，压低不透明度免得压住标题 */
  & > svg {
    width: 150%;
    height: auto;
    opacity: 0.4;
    -webkit-mask-image: radial-gradient(circle at 50% 44%, black 30%, transparent 72%);
    mask-image: radial-gradient(circle at 50% 44%, black 30%, transparent 72%);
  }

  ${fromContainer(containers.hero, 'split')} {
    & > svg {
      width: min(118vh, 1080px);
      opacity: 0.8;
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
  /* 窄首屏压掉上下留白：标题 + 按钮仍要收在一屏之内 */
  padding: 96px 6vw;

  ${fromContainer(containers.hero, 'actions')} {
    padding: 132px 7vw 150px;
  }
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
  font-size: clamp(2.35rem, 6.4cqi, 5.4rem);
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
    text-shadow: 0 0 28px rgba(var(--accent-rgb), 0.16);
  }
`

export const HeroLead = styled.p<RevealProps>`
  ${reveal}
  color: var(--text-muted);
  font-size: clamp(1rem, 1.4cqi, 1.15rem);
  line-height: 1.9;
  max-width: 620px;
`

export const HeroActions = styled.div<RevealProps>`
  ${reveal}
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 16px;
  width: min(360px, 100%);

  ${fromContainer(containers.hero, 'actions')} {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    width: auto;
  }
`

/** 底部数据带：全宽、发丝线上边框、玻璃底。 */
export const HeroStatBar = styled.div<RevealProps>`
  ${reveal}
  ${container(containers.heroStats)}
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
    grid-template-columns: repeat(2, 1fr);

    ${fromContainer(containers.heroStats, 'stats')} {
      grid-template-columns: repeat(4, 1fr);
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

  /* 两列布局时第 3 项换行，去掉它的左分隔线 */
  &:nth-child(3)::before {
    display: none;
  }

  ${fromContainer(containers.heroStats, 'stats')} {
    &:nth-child(3)::before {
      display: block;
    }
  }
`

export const HeroStatValue = styled.strong`
  font-size: clamp(1.4rem, 2.2cqi, 1.9rem);
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
  bottom: 48px;
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

  /* 窄首屏放不下滚动提示 */
  display: none;

  ${fromContainer(containers.hero, 'split')} {
    display: grid;
  }
`
