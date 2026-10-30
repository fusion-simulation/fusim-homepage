import { css, styled } from 'styled-components'

/** 正文（MDX）排版，对应原模板中的 `.prose`。 */
export const proseCss = css`
  & > * + * {
    margin-top: 14px;
  }

  & h1 {
    line-height: 1.2;
    letter-spacing: -0.02em;
    font-size: clamp(2rem, 3vw, 2.6rem);
    margin-top: 0;
  }

  & h2 {
    line-height: 1.2;
    letter-spacing: -0.02em;
    font-size: 1.6rem;
    margin-top: 26px;
  }

  & h3 {
    line-height: 1.2;
    letter-spacing: -0.02em;
    font-size: 1.25rem;
    margin-top: 22px;
  }

  & h4 {
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  & p {
    color: var(--text-muted);
    line-height: 1.8;
  }

  & a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  & a:hover {
    text-decoration-thickness: 2px;
  }

  & ul {
    padding-left: 1.2rem;
    color: var(--text-muted);
    line-height: 1.8;
  }

  & ol {
    padding-left: 1.2rem;
    color: var(--text-muted);
    line-height: 1.8;
  }

  & li + li {
    margin-top: 6px;
  }

  & blockquote {
    border-left: 2px solid var(--accent);
    padding-left: 16px;
    color: var(--text-muted);
  }

  & code {
    font-family: var(--font-mono);
    font-size: 0.95em;
    background-color: rgba(63, 109, 246, 0.12);
    padding: 0.12em 0.35em;
    border-radius: 6px;
  }

  & pre {
    background-color: var(--bg-soft);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 16px;
    overflow: auto;
  }

  & pre code {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
  }
`

/** 产品页正文容器：`$wide` 对应 frontmatter 的 `wide: true`（2400px）。 */
export const ProseArticle = styled.article<{ $wide?: boolean }>`
  ${proseCss}
  margin: 0 auto;
  max-width: ${({ $wide }) => ($wide ? '2400px' : '860px')};
  padding: ${({ $wide }) => ($wide ? '72px 20px 20px' : '72px 7vw 20px')};
`

export const ProseCard = styled.div`
  background-color: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 34px;
  box-shadow: var(--prose-shadow);

  & > :first-child {
    margin-top: 0;
  }
`
