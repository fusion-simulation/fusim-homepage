import { styled } from 'styled-components'
import type { ContentPage } from '../lib/content'
import { ProseArticle, ProseCard } from '../styles/prose'
import { Card, HeroTag, Meta, Reveal, Section } from '../styles/shared'

const JournalArticle = styled(Card)`
  margin-top: 24px;
`

export function MdxPage({ page }: { page: ContentPage }) {
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
      <ProseArticle $wide={frontmatter.wide}>
        {kind === 'product' ? (
          <ProseCard>
            <Component />
          </ProseCard>
        ) : (
          <Component />
        )}
      </ProseArticle>
    )
  }

  return <Component />
}
