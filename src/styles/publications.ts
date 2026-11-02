import { styled } from 'styled-components'

/** 论文附件文件树。 */

export const TreeIcon = styled.span`
  display: inline-flex;
  flex: none;

  & svg {
    width: 1em;
    height: 1em;
    display: block;
    opacity: 0.75;
  }
`

export const TreeList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 0.3rem;
`

export const TreeItem = styled.li`
  min-width: 0;
  margin-bottom: 0.2rem;
`

export const TreeSize = styled.span<{ $variant?: 'site' | 'attachment' }>`
  margin-left: 0.5rem;
  font-size: 0.8em;
  color: ${({ $variant }) => ($variant === 'attachment' ? '#5a6472' : 'var(--text-muted)')};
`

export const TreeFileLink = styled.a<{ $onAttachmentPage?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  max-width: 100%;
  /* 长文件名在窄容器里换行，不产生横向溢出 */
  overflow-wrap: anywhere;
  color: ${({ $onAttachmentPage }) => ($onAttachmentPage ? '#1b46c2' : 'var(--accent-ink)')};

  &:hover {
    text-decoration: underline;
  }
`

export const TreeSummary = styled.summary`
  cursor: pointer;
  user-select: none;
  outline: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  max-width: 100%;
  overflow-wrap: anywhere;
`

export const TreeDirLink = styled.a`
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export const TreeSubtree = styled.div`
  padding-left: 1.5rem;
  margin-top: 0.2rem;
`

export const DataFiles = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9em;
`

/** 论文附件目录页（`/assets/pub/.../`），固定浅色配色，与原生成的静态页一致。 */
export const AttachmentRoot = styled.div`
  background-color: #fff;
  min-height: 100vh;
  color: #101418;
  font-family: sans-serif;
  padding: clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem);
`

export const AttachmentInner = styled.div`
  max-width: 800px;
  margin: 0 auto;
`

export const BackLink = styled.a`
  display: inline-block;
  margin-bottom: 2rem;
  color: #1b46c2;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`

export const AttachmentCard = styled.div`
  background-color: #fff;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`
