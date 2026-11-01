import { styled } from 'styled-components'
import { Shell } from './shared'

/** 内页页头：mono 眉题 + 大标题 + 描述，底部发丝线。 */

export const PageHero = styled.header`
  border-bottom: 1px solid var(--line);
  background:
    radial-gradient(720px 320px at 24% 0%, rgba(var(--accent-rgb), 0.07), transparent 70%),
    var(--bg-deep);
`

export const PageHeroInner = styled(Shell)`
  padding-top: 84px;
  padding-bottom: 56px;
  display: grid;
  gap: 18px;
`

export const PageEyebrow = styled.p`
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.3em;
  color: var(--accent-ink);
  text-transform: uppercase;
`

export const PageTitle = styled.h1`
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.2;
`

export const PageDesc = styled.p`
  color: var(--text-muted);
  line-height: 1.85;
  max-width: 640px;
  font-size: 1.05rem;
`
