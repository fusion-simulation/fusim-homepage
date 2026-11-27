import { styled } from 'styled-components'
import { Link } from 'wouter'
import { PageHeader } from '../components/PageHeader'
import { type ContentPage, isArticleKind } from '../lib/content'
import { DateMono } from '../styles/hub'
import { ProseArticle, ProseCard } from '../styles/prose'

/** 页头底部行的间隔点，颜色跟随 `PageDesc` 的次要正文色。 */
const MetaSep = styled.span`
  margin: 0 10px;
`

/** 详情页标签行：页头底部渲染在 `<p>` 里，所以整行必须是行内元素。 */
const DetailTags = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: 10px;
  vertical-align: middle;
`

/** 详情页标签：点一下回列表并筛上该标签。用 `<a>`（走 wouter）而不是 `<button>`，才能右键开新窗口、无 JS 也能用。 */
const DetailTag = styled(Link)`
  padding: 2px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.07);
  color: var(--accent-ink);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.14);
  }
`

/**
 * 页头底部行：发布日期 + 公众号原文链接 + 标签（企业动态）。
 * 渲染在 `PageDesc` 内，所以只能用行内元素。
 */
function HeaderFooter({ page }: { page: ContentPage }) {
  const { date, external_url: url, tags } = page.frontmatter
  if (!date && !url && !tags?.length) return null

  return (
    <>
      {date ? <DateMono>{date}</DateMono> : null}
      {date && url ? <MetaSep>·</MetaSep> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          来源：微信公众号原文
        </a>
      ) : null}
      {tags?.length ? (
        <DetailTags>
          {tags.map((tag) => (
            <DetailTag key={tag} href={`/press/?tag=${encodeURIComponent(tag)}`}>
              {tag}
            </DetailTag>
          ))}
        </DetailTags>
      ) : null}
    </>
  )
}

export function MdxPage({ page }: { page: ContentPage }) {
  const { Component, frontmatter, kind } = page
  // 企业动态同源：页头（标题 + 简介 + 日期/来源/标签）+ 单栏正文，不套卡片。
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
