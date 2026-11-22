import { styled } from 'styled-components'
import { PageHeader } from '../components/PageHeader'
import { type ContentPage, isArticleKind } from '../lib/content'
import { DateMono } from '../styles/hub'
import { ProseArticle, ProseCard } from '../styles/prose'

/** 页头底部行的间隔点，颜色跟随 `PageDesc` 的次要正文色。 */
const MetaSep = styled.span`
  margin: 0 10px;
`

/**
 * 页头底部行：发布日期 + 公众号原文链接（公司新闻与社会报导共用）。
 * 渲染在 `PageDesc` 内，所以只能用行内元素。
 */
function HeaderFooter({ page }: { page: ContentPage }) {
  const { date, external_url: url } = page.frontmatter
  if (!date && !url) return null

  return (
    <>
      {date ? <DateMono>{date}</DateMono> : null}
      {date && url ? <MetaSep>·</MetaSep> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          来源：微信公众号原文
        </a>
      ) : null}
    </>
  )
}

export function MdxPage({ page }: { page: ContentPage }) {
  const { Component, frontmatter, kind } = page
  // 公司新闻与社会报导同源：页头（标题 + 简介 + 日期/来源）+ 单栏正文，不套卡片。
  const withMeta = isArticleKind(kind)

  return (
    <>
      <PageHeader
        title={frontmatter.title ?? ''}
        description={frontmatter.description}
        footer={withMeta ? <HeaderFooter page={page} /> : undefined}
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
