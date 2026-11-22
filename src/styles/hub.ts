import { css, styled } from 'styled-components'
import { Link } from 'wouter'
import { type RevealProps, reveal } from './animation'
import { containers, fromContainer } from './responsive'

/**
 * 列表类内页（论文 / 公司新闻 / 报道）共用的「暗色科研仪表盘」版式：
 * 等宽编号、角标框线、数据统计条、发丝线时间轴。全部取自站点既有 token，不引入新色值。
 */

/** 减少动效偏好：关闭入场与悬停位移，保证内容始终可见。 */
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
    transition: none;
  }
`

/** 四角框线：默认淡显，悬停时外扩（与首页 HUD 视觉一致）。 */
const corners = css`
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border: 0 solid var(--accent);
    opacity: 0.45;
    pointer-events: none;
    transition:
      opacity 0.25s ease,
      width 0.25s ease,
      height 0.25s ease;
  }

  &::before {
    top: -1px;
    left: -1px;
    border-top-width: 2px;
    border-left-width: 2px;
  }

  &::after {
    bottom: -1px;
    right: -1px;
    border-bottom-width: 2px;
    border-right-width: 2px;
  }

  &:hover::before,
  &:hover::after {
    opacity: 1;
    width: 22px;
    height: 22px;
  }
`

/* ---------- 统计条 ---------- */

export const StatStrip = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin: 0;
  border: 1px solid var(--line);
  background: var(--surface-translucent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`

export const StatCell = styled.div`
  position: relative;
  padding: 20px 24px;

  & + & {
    border-left: 1px solid var(--line);
  }

  & dt {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  & dd {
    margin: 6px 0 0;
    font-family: var(--font-mono);
    font-size: clamp(1.6rem, 2.6vw, 2.2rem);
    font-weight: 600;
    color: var(--text);
    line-height: 1.1;
  }

  & dd span {
    margin-left: 4px;
    font-size: 0.8rem;
    color: var(--accent-ink);
    letter-spacing: 0.08em;
  }
`

/* ---------- 论文：年份分组 ---------- */

export const YearBlock = styled.div`
  display: grid;
  gap: 24px;
  padding-top: 48px;
  border-top: 1px solid var(--line);

  &:first-of-type {
    border-top: 0;
    padding-top: 0;
  }

  ${fromContainer(containers.shell, 'split')} {
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 48px;
  }
`

export const YearRail = styled.div`
  display: grid;
  gap: 6px;
  align-content: start;

  ${fromContainer(containers.shell, 'split')} {
    position: sticky;
    top: 104px;
    align-self: start;
  }
`

export const YearNumber = styled.h2`
  font-family: var(--font-mono);
  font-size: clamp(2.6rem, 5vw, 3.8rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  color: transparent;
  background: linear-gradient(120deg, var(--text) 10%, var(--accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
`

export const YearCount = styled.p`
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  color: var(--accent-ink);
  text-transform: uppercase;
`

export const PubList = styled.div`
  display: grid;
  gap: 16px;
  min-width: 0;
`

export const PubCard = styled.article<RevealProps>`
  ${reveal}
  ${corners}
  position: relative;
  display: grid;
  gap: 12px;
  padding: 24px 26px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--line-strong);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
  }

  ${reducedMotion}
`

export const PubHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  color: var(--text-muted);
  text-transform: uppercase;
`

export const PubIndex = styled.span`
  color: var(--accent-ink);
`

export const PubTag = styled.span`
  padding: 2px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.07);
  color: var(--accent-ink);
`

export const PubTitle = styled.h3`
  font-size: clamp(1.05rem, 1.5vw, 1.22rem);
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.01em;
  /* 论文标题常是 pzhu_bbead_jgr26_rev_041026 这种无空格长串：
     320px 下必须能在任意位置断开，否则整页横向滚动 */
  overflow-wrap: anywhere;

  & a {
    color: var(--text);
    transition: color 0.2s ease;
  }

  & a:hover {
    color: var(--accent-ink);
  }
`

export const PubMeta = styled.p`
  color: var(--text-muted);
  font-size: 0.93rem;
  line-height: 1.7;
`

export const PubAction = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 8px 14px;
  border: 1px solid var(--line-strong);
  background: var(--surface-translucent);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;

  & svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  &:hover {
    border-color: var(--accent);
    color: var(--accent-ink);
    box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.18);
  }
`

/* ---------- 公司新闻：精选 + 网格 ---------- */

export const JournalFeature = styled.article<RevealProps>`
  ${reveal}
  ${corners}
  position: relative;
  display: grid;
  gap: 18px;
  padding: clamp(28px, 4vw, 44px);
  background:
    radial-gradient(640px 280px at 100% 0%, rgba(var(--accent-rgb), 0.12), transparent 70%),
    var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.32);
  box-shadow: 0 0 44px rgba(var(--accent-rgb), 0.08);

  ${reducedMotion}

  /* 精选标题是真正的区块标题：保留 Section 那条 5px 渐变线的观感（原先由 Section 提供） */
  & h2 {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: clamp(1.7rem, 3vw, 2.4rem);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.02em;
  }

  & h2::before {
    content: "";
    flex: none;
    width: 5px;
    height: 0.9em;
    background: linear-gradient(180deg, var(--accent), var(--accent-deep));
  }

  & h2 a {
    color: var(--text);
  }

  & h2 a:hover {
    color: var(--accent-ink);
  }

  & p {
    color: var(--text-muted);
    line-height: 1.85;
    font-size: 1.05rem;
    max-width: 720px;
  }
`

export const FeatureLabel = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  color: var(--accent-ink);
  text-transform: uppercase;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    transform: rotate(45deg);
    background: var(--accent);
    box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.6);
  }
`

export const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 20px;
`

export const PostCard = styled.article<RevealProps>`
  ${reveal}
  ${corners}
  position: relative;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 26px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
  }

  & h3 {
    font-size: 1.18rem;
    line-height: 1.45;
    letter-spacing: 0.02em;
  }

  & h3 a {
    color: var(--text);
  }

  & h3 a:hover {
    color: var(--accent-ink);
  }

  & p {
    color: var(--text-muted);
    line-height: 1.75;
    font-size: 0.95rem;
  }

  ${reducedMotion}
`

export const PostFoot = styled.div`
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px dashed var(--line-strong);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: var(--text-muted);
`

export const ReadMore = styled.span`
  color: var(--accent-ink);
  transition: letter-spacing 0.25s ease;

  ${PostCard}:hover & {
    letter-spacing: 0.2em;
  }
`

export const DateMono = styled.span`
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  color: var(--accent-ink);
`

/* ---------- 报道：发丝时间轴 ---------- */

export const Timeline = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0 0 0 clamp(24px, 4vw, 40px);
  display: grid;
  gap: 20px;
  position: relative;

  /* 竖向等离子体发丝线 */
  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 10px;
    bottom: 10px;
    width: 1px;
    background: linear-gradient(180deg, var(--accent), var(--accent-deep) 60%, transparent);
    opacity: 0.6;
  }
`

export const TimelineEntry = styled.li<RevealProps>`
  ${reveal}
  position: relative;

  /* 节点：45° 菱形，与首页标签的指示灯语汇一致 */
  &::before {
    content: '';
    position: absolute;
    left: calc(-1 * clamp(24px, 4vw, 40px) + 2px);
    top: 30px;
    width: 9px;
    height: 9px;
    transform: rotate(45deg);
    background: var(--accent);
    box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.6);
  }

  ${reducedMotion}
`

/** 社会报导卡片的外形：内链与外链只差基座元素，共用这一份样式。 */
const pressCardCss = css`
  ${corners}
  position: relative;
  display: grid;
  gap: 12px;
  padding: 24px 28px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  color: var(--text);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateX(4px);
    border-color: var(--line-strong);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
  }

  & h2 {
    font-size: clamp(1.05rem, 1.6vw, 1.25rem);
    font-weight: 600;
    line-height: 1.5;
    letter-spacing: 0.01em;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** 站内专题：走 wouter，不整页刷新。 */
export const PressCardLink = styled(Link)`
  ${pressCardCss}
`

/** 外部报导：新窗口打开。 */
export const PressCardAnchor = styled.a`
  ${pressCardCss}
`

export const PressSource = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  color: var(--accent-ink);

  & svg {
    width: 14px;
    height: 14px;
    display: block;
  }
`

export const PressHint = styled.span`
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: var(--text-muted);
`

/* ---------- 空态 ---------- */

export const EmptyPanel = styled.div<RevealProps>`
  ${reveal}
  ${corners}
  position: relative;
  padding: clamp(28px, 4vw, 44px);
  background: var(--bg-card);
  border: 1px dashed var(--line-strong);
  display: grid;
  gap: 12px;

  & h2,
  & h3 {
    font-size: 1.2rem;
  }

  & p,
  & div {
    color: var(--text-muted);
    line-height: 1.8;
  }

  & code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--accent-ink);
  }

  ${reducedMotion}
`
