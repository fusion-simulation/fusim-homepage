import { styled } from 'styled-components'
import { PageHeader } from '../components/PageHeader'
import type { ContentPage } from '../lib/content'
import { ProseArticle, ProseCard } from '../styles/prose'
import { Card, HeroTag, Meta, Reveal, Section } from '../styles/shared'

const JournalArticle = styled(Card)`
  margin-top: 24px;
`

const EYEBROW_BY_KIND: Record<'product' | 'product_section' | 'page', string> = {
  product: 'Products',
  product_section: 'Solutions',
  page: 'Page',
}

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

  return (
    <>
      <PageHeader
        eyebrow={EYEBROW_BY_KIND[kind]}
        title={frontmatter.title ?? ''}
        description={frontmatter.description}
        width="reading"
      />
      <ProseArticle>
        {kind === 'product' ? (
          <ProseCard>
            <Component />
          </ProseCard>
        ) : (
          <Component />
        )}
      </ProseArticle>
    </>
  )
}
