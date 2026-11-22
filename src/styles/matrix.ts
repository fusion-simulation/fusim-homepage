import { css, styled } from 'styled-components'
import { Link } from 'wouter'
import type { DeliveryState } from '../content/product-matrix'
import { type RevealProps, reveal } from './animation'
import { container, containers, fromContainer } from './responsive'
import { SectionHead } from './shared'

/**
 * 产品矩阵页的版式：一张「过程 × 交付形态」的覆盖表。
 *
 * 骨架是 grid 而不是 table：窄容器要把整行折成条目，对表元素做 `display: block`
 * 会破坏表格语义，而这里每格本身是短语而非数据单元格。宽屏靠同一套列宽对齐出表感。
 */

/** 四列：过程（固定 200px，长标签换行也不挤歪）| 标准产品 | 工程仿真方案 | 装置证据。 */
const ROW_COLUMNS = '200px minmax(0, 1fr) minmax(0, 1fr) 150px'

/** 概览带：紧贴页头，节奏比 Band 紧一档。 */
export const OverviewBand = styled.section`
  ${container(containers.shell)}
  width: min(100% - 14vw, var(--max-width));
  margin: 0 auto;
  padding: clamp(2rem, 3.2vw, 2.25rem) 0;
`

/** 矩阵段：本页主角，节奏比 Band 紧一档，让表头和一排数据在首屏里出现。 */
export const MatrixBand = styled.section`
  padding: clamp(2.25rem, 3.2vw, 2.5rem) 0 clamp(3.5rem, 6vw, 5rem);
  border-top: 1px solid var(--line);
`

/** 矩阵区块头：比通用 SectionHead 更紧，把视线尽快交给表格。 */
export const MatrixHeadBlock = styled(SectionHead)`
  gap: 14px;
  margin-bottom: 32px;

  & p {
    max-width: 640px;
  }
`

/* ---------- 概览带：4 个数字 ---------- */

/** 1px 间隙 + 底色 = 无论怎么换行都不会出错的发丝分隔线。 */
export const CoverageBar = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);

  ${fromContainer(containers.shell, 'stats')} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

export const CoverageCell = styled.div`
  background: var(--bg-soft);
  padding: 16px 20px;
  display: grid;
  gap: 4px;
  align-content: start;

  & dt {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  & dd {
    margin: 0;
    font-family: var(--font-mono);
    font-size: clamp(1.5rem, 2.4vw, 2rem);
    font-weight: 600;
    line-height: 1.1;
    color: var(--text);
  }

  & dd span {
    margin-left: 4px;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    color: var(--accent-ink);
  }
`

/* ---------- 矩阵 ---------- */

/** 列头：窄容器隐藏（每格自带列名）。 */
export const MatrixHead = styled.div`
  display: none;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);

  ${fromContainer(containers.shell, 'split')} {
    display: grid;
    grid-template-columns: ${ROW_COLUMNS};
    gap: 24px;
    align-items: end;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line-strong);
  }
`

export const MatrixList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`

/** 一行：窄容器是一条条目，宽容器是表格的一行。 */
export const MatrixRow = styled.li<RevealProps>`
  ${reveal}
  display: grid;
  gap: 12px;
  padding: 22px 0;
  border-top: 1px solid var(--line);
  transition: background-color 0.2s ease;

  &:first-child {
    border-top: 0;
  }

  &:hover {
    background-color: rgba(var(--accent-rgb), 0.035);
  }

  ${fromContainer(containers.shell, 'split')} {
    grid-template-columns: ${ROW_COLUMNS};
    gap: 24px;
    align-items: start;
    padding: 20px 0;
  }
`

export const ProcessCell = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  align-items: baseline;

  & > span {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    color: var(--accent-ink);
  }

  & h3 {
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1.35;
  }

  & p {
    grid-column: 1 / -1;
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.7;
  }
`

/** 一个交付格：状态点 + 一句「怎么用」。 */
export const DeliveryCell = styled.div<{ $state: DeliveryState }>`
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  column-gap: 10px;
  row-gap: 6px;
  align-items: start;

  & > p {
    line-height: 1.65;
    font-size: 0.95rem;
    color: ${({ $state }) => ($state === 'delivered' ? 'var(--text)' : 'var(--text-muted)')};
  }
`

/**
 * 窄容器里每格自带的列名。宽容器由列头承担，这里 `display: none`。
 * 不加透明度：`--text-muted` 已经是 5.6:1，再叠 0.8 会掉到 3.6:1，低于 AA。
 */
export const CellLabel = styled.span`
  grid-column: 1 / -1;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);

  ${fromContainer(containers.shell, 'split')} {
    display: none;
  }
`

/**
 * 状态点。三种状态各有形状差异（实心 / 描边 / 虚线），不靠颜色单独承载信息——
 * 每格都配文案，图例也带文字。
 */
export const StateDot = styled.span<{ $state: DeliveryState }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: none;
  margin-top: 8px;

  ${({ $state }) =>
    $state === 'delivered'
      ? css`
          background: var(--accent);
        `
      : $state === 'scoped'
        ? css`
            border: 1.5px solid var(--accent);
          `
        : css`
            border: 1.5px dashed var(--line-strong);
          `}
`

export const DeviceTags = styled.div`
  display: grid;
  gap: 8px;
  align-content: start;

  & > div {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  & > div span {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    border: 1px solid var(--line);
    padding: 3px 7px;
    white-space: nowrap;
  }

  ${fromContainer(containers.shell, 'split')} {
    & > div {
      justify-content: flex-end;
    }
  }
`

export const Legend = styled.ul`
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 26px;
  font-size: 0.82rem;
  color: var(--text-muted);

  & li {
    display: inline-flex;
    align-items: center;
    gap: 9px;
  }

  & li > span:first-child {
    margin-top: 0;
  }
`

/** 图例下方的直达入口：标准产品那一列说了「云端即用」，就得有地方可去。 */
export const MatrixAction = styled.p`
  margin-top: 22px;
`

/* ---------- 支撑层：5 类求解器 + 算力 ---------- */

/**
 * 5 个格子数不是列数的整数倍，用 gap + 底色画分隔线会在最后一行露出空格底块。
 * 改用 outline 分格：不吃布局、相邻边重叠成一条发丝线，任意换行都不露底。
 */
export const SolverStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 0;
  outline: 1px solid var(--line);
  background: var(--bg-soft);
`

export const SolverCell = styled.div`
  background: var(--bg-soft);
  outline: 1px solid var(--line);
  padding: 18px 16px;
  display: grid;
  gap: 6px;
  align-content: start;

  & span {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    color: var(--accent-ink);
  }

  & strong {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
  }

  & p {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
`

export const ComputeRow = styled.div`
  margin-top: 16px;
  display: grid;
  gap: 8px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  background: var(--surface-translucent);

  & strong {
    font-family: var(--font-mono);
    font-size: 1.5rem;
    line-height: 1.1;
    color: var(--accent-ink);
  }

  & p {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.7;
  }

  ${fromContainer(containers.shell, 'actions')} {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: 24px;
  }
`

/* ---------- 装置与证据 ---------- */

export const DeviceGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
`

/** 两张证卡：从装置直接进到已有的方案页，文案不复制（标题/描述取自 MDX frontmatter）。 */
export const DeviceCard = styled(Link)<RevealProps>`
  ${reveal}
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 26px;
  border: 1px solid var(--line);
  background: var(--bg-card);
  transition:
    border-color 0.25s ease,
    transform 0.25s ease;

  &:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  & em {
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 0.7rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }

  & strong {
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  & p {
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.75;
  }

  & i {
    margin-top: 6px;
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    color: var(--accent-ink);
  }
`

export const EvidenceGrid = styled.ul`
  list-style: none;
  margin: 32px 0 0;
  padding: 0;
  display: grid;
  gap: 0;

  ${fromContainer(containers.shell, 'actions')} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 32px;
  }
`

export const EvidenceItem = styled.li`
  display: grid;
  gap: 6px;
  padding: 16px 0;
  border-top: 1px solid var(--line);

  & strong {
    font-size: 0.95rem;
    font-weight: 600;
  }

  & p {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.7;
  }
`

/* ---------- 出口 ---------- */

export const ExitBand = styled.div`
  display: grid;
  gap: 18px;
  max-width: 640px;

  & h2 {
    font-size: clamp(1.6rem, 2.6vw, 2.1rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.3;
  }

  & p {
    color: var(--text-muted);
    line-height: 1.8;
    font-size: 1.02rem;
  }
`

/** 出口按钮行。 */
export const ExitActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 4px;
`
