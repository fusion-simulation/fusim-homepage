import { mergeClasses } from '@griffel/react'
import { styled } from 'styled-components'
import type { ContentPage } from '../lib/content'
import { useProseStyles } from '../styles/prose'
import { Card, HeroTag, Meta, Reveal, Section } from '../styles/shared'

const JournalArticle = styled(Card)`
  margin-top: 24px;
`

export function MdxPage({ page }: { page: ContentPage }) {
  const prose = useProseStyles()
  const { Component, frontmatter, kind } = page

  if (kind === 'journal') {
    return (
      <Section id="journal-post">
        <Reveal>
          <HeroTag>企业日志</HeroTag>
          <h1>{frontmatter.title}</h1>
          <Meta>{frontmatter.date}</Meta>
        </Reveal>
        <JournalArticle as="article" $delay={1}>
          <Component />
        </JournalArticle>
      </Section>
    )
  }

  if (kind === 'product' || kind === 'product_section') {
    return (
      <article
        className={mergeClasses(
          prose.prose,
          frontmatter.wide ? prose.proseBoxWide : prose.proseBox,
        )}
      >
        {kind === 'product' ? (
          <div className={prose.proseCard}>
            <Component />
          </div>
        ) : (
          <Component />
        )}
      </article>
    )
  }

  return <Component />
}
