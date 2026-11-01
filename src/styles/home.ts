import { styled } from 'styled-components'
import { marquee, type RevealProps, reveal } from './animation'

/** 首页专属区块：合作带 / 三大技术 bento / 工作流对比 / 产品聚焦 / 成果带 / CTA。 */

/* ---------- 合作单位跑马灯 ---------- */

export const PartnerBand = styled.div`
  border-bottom: 1px solid var(--line);
  background: var(--bg-deep);
  overflow: hidden;

  /* 两端渐隐遮罩 */
  -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
`

export const PartnerTrack = styled.div`
  display: flex;
  width: max-content;
  animation: ${marquee} 36s linear infinite;

  &:hover {
    animation-play-state: paused;
  }
`

export const PartnerGroup = styled.ul`
  display: flex;
  align-items: center;
  list-style: none;
  padding: 26px 0;
  margin: 0;
`

export const PartnerItem = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 0 44px;
  color: var(--text-muted);
  font-size: 0.95rem;
  letter-spacing: 0.14em;
  white-space: nowrap;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text);
  }

  &::after {
    content: "";
    width: 5px;
    height: 5px;
    transform: rotate(45deg);
    background: var(--line-strong);
    margin-left: 44px;
  }

  & strong {
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.06em;
  }
`

/* ---------- 三大核心技术 ---------- */

export const TechGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`

export const TechCard = styled.article<RevealProps & { $featured?: boolean }>`
  ${reveal}
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 34px 30px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(var(--accent-rgb), 0.06), transparent 60%),
    var(--bg-card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  overflow: hidden;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  /* 顶部能量线：featured 用金色 */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ $featured }) =>
      $featured
        ? 'linear-gradient(90deg, var(--gold), var(--gold-deep), transparent)'
        : 'linear-gradient(90deg, var(--accent), var(--accent-deep), transparent)'};
  }

  &:hover {
    transform: translateY(-6px);
    border-color: var(--line-strong);
    box-shadow: 0 24px 60px rgba(2, 8, 24, 0.45);
  }
`

export const TechNo = styled.span`
  font-family: var(--font-mono);
  font-size: 0.85rem;
  letter-spacing: 0.24em;
  color: var(--text-muted);
`

export const TechKicker = styled.h3`
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--accent-ink);

  & small {
    display: block;
    margin-top: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
  }
`

export const TechDesc = styled.p`
  color: var(--text-muted);
  line-height: 1.85;
  font-size: 0.98rem;
`

export const TechPoints = styled.ul`
  list-style: none;
  padding: 0;
  margin: auto 0 0;
  display: grid;
  gap: 10px;
  border-top: 1px dashed var(--line);
  padding-top: 18px;

  & li {
    display: flex;
    gap: 10px;
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.6;
  }

  & li::before {
    content: "▸";
    color: var(--accent);
    flex: none;
  }
`

/** 卡片右上角的能力图形。 */
export const TechGlyph = styled.span`
  position: absolute;
  top: 26px;
  right: 24px;
  width: 64px;
  height: 64px;
  color: var(--accent);
  opacity: 0.8;
  filter: drop-shadow(0 0 12px rgba(var(--accent-rgb), 0.35));

  & svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`

/* ---------- 工作流对比 ---------- */

export const FlowGrid = styled.div<RevealProps>`
  ${reveal}
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const flowColumnCss = `
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  padding: 30px 28px;
  background: var(--bg-card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
`

export const FlowCol = styled.div<{ $new?: boolean }>`
  ${flowColumnCss}
  border-color: ${({ $new }) => ($new ? 'rgba(var(--accent-rgb), 0.4)' : 'var(--line)')};
  box-shadow: ${({ $new }) => ($new ? '0 0 44px rgba(var(--accent-rgb), 0.1)' : 'none')};
`

export const FlowHead = styled.p<{ $new?: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 22px;

  & strong {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  & span {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    color: ${({ $new }) => ($new ? 'var(--accent-ink)' : 'var(--text-muted)')};
  }
`

export const FlowSteps = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
`

export const FlowStep = styled.li<{ $new?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  color: ${({ $new }) => ($new ? 'var(--text)' : 'var(--text-muted)')};
  background: ${({ $new }) => ($new ? 'rgba(var(--accent-rgb), 0.07)' : 'var(--surface-translucent)')};
  border: 1px solid ${({ $new }) => ($new ? 'rgba(var(--accent-rgb), 0.28)' : 'var(--line)')};
  position: relative;

  & > i {
    flex: none;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: ${({ $new }) => ($new ? '#170322' : 'var(--text-muted)')};
    background: ${({ $new }) =>
      $new ? 'linear-gradient(120deg, var(--accent), var(--accent-deep))' : 'var(--metric-bg)'};
    border: 1px solid ${({ $new }) => ($new ? 'transparent' : 'var(--metric-border)')};
  }
`

export const FlowBanner = styled.p<RevealProps>`
  ${reveal}
  margin-top: 28px;
  padding: 22px 30px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--hl-rgb), 0.35);
  background: linear-gradient(90deg, rgba(var(--hl-rgb), 0.08), transparent 65%);
  color: var(--text);
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 12px;

  & strong {
    color: var(--gold);
    font-size: 1.25rem;
  }
`

/* ---------- 产品聚焦（CBaldur） ---------- */

export const ProductSpot = styled.article<RevealProps>`
  ${reveal}
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 40px;
  padding: 48px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--line-strong);
  background:
    radial-gradient(70% 120% at 85% 20%, rgba(var(--accent-rgb), 0.1), transparent 60%),
    var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    padding: 32px 26px;
  }
`

export const ProductSpotText = styled.div`
  display: grid;
  gap: 18px;
  align-content: center;

  & h3 {
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  & > p {
    color: var(--text-muted);
    line-height: 1.85;
  }
`

export const ProductFeatures = styled.ul`
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;

  & li {
    display: flex;
    gap: 12px;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.96rem;
  }

  & li::before {
    content: "";
    flex: none;
    width: 18px;
    height: 18px;
    border: 1px solid var(--accent);
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e05cff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")
      center / 10px no-repeat,
      rgba(var(--accent-rgb), 0.08);
  }
`

export const ProductSpotActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 6px;
`

/** 右侧 mini 控制台视窗。 */
export const ProductConsole = styled.div`
  align-self: center;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-strong);
  background: var(--bg-deep);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(2, 8, 24, 0.5);

  & header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
    background: var(--surface-translucent);

    & i {
      width: 9px;
      height: 9px;
      background: var(--line-strong);
    }

    & span {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 0.68rem;
      letter-spacing: 0.2em;
      color: var(--text-muted);
    }
  }
`

export const ConsoleBody = styled.div`
  padding: 20px;
  display: grid;
  gap: 14px;
`

export const ConsoleRow = styled.p<{ $w?: number }>`
  height: 12px;
  background: var(--bar, var(--line));
  width: ${({ $w = 100 }) => `${$w}%`};
`

export const ConsoleReadout = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  & div {
    padding: 12px;
    border-radius: var(--radius-sm);
    background: var(--metric-bg);
    border: 1px solid var(--metric-border);
    display: grid;
    gap: 3px;

    & strong {
      font-family: var(--font-mono);
      font-size: 1rem;
      color: var(--accent-ink);
    }

    & span {
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }
  }
`

/* ---------- 成果验证带 ---------- */

export const VerifyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

export const VerifyCard = styled.article<RevealProps>`
  ${reveal}
  padding: 30px 28px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: var(--bg-card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: grid;
  gap: 10px;

  & strong {
    font-size: 1.05rem;
    color: var(--text);
    letter-spacing: 0.02em;
  }

  & p {
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.7;
  }

  & em {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    color: var(--accent-ink);
  }
`

export const VerifyValue = styled.span`
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-sans);
  color: var(--gold);
  text-shadow: 0 0 24px rgba(var(--hl-rgb), 0.25);
`

/* ---------- CTA ---------- */

export const CtaPanel = styled.div<RevealProps>`
  ${reveal}
  position: relative;
  border-radius: var(--radius-xl);
  padding: 72px 8vw;
  text-align: center;
  background:
    radial-gradient(60% 130% at 50% 0%, rgba(var(--accent-rgb), 0.12), transparent 65%),
    var(--bg-deep);
  border: 1px solid var(--line-strong);
  overflow: hidden;

  /* 四角 HUD 括号 */
  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 26px;
    height: 26px;
    pointer-events: none;
  }

  &::before {
    top: -1px;
    left: -1px;
    border-top: 2px solid var(--accent);
    border-left: 2px solid var(--accent);
    border-top-left-radius: var(--radius-xl);
  }

  &::after {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid var(--accent);
    border-right: 2px solid var(--accent);
    border-bottom-right-radius: var(--radius-xl);
  }

  & h2 {
    font-size: clamp(1.9rem, 3.4vw, 3rem);
    font-weight: 700;
    letter-spacing: 0.03em;
    line-height: 1.3;
  }

  & p {
    margin-top: 16px;
    color: var(--text-muted);
    line-height: 1.8;
  }
`

export const CtaActions = styled.div`
  margin-top: 36px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
`
