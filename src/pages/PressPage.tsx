import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { ExternalLinkIcon } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { newsPages } from '../lib/content'
import { collectTags, filterByTag, parseTag } from '../lib/tags'
import {
  DateMono,
  EmptyPanel,
  NewsCard,
  PostFoot,
  ReadMore,
  TagBar,
  TagButton,
  TagCount,
  TagRow,
  Timeline,
  TimelineEntry,
} from '../styles/hub'
import { Section } from '../styles/shared'

/**
 * 企业动态：`src/content/press/` 全部文章按日期倒序，可按标签筛选。
 *
 * 筛选状态只活在客户端：预渲染 HTML 与首帧渲染的都是全量（`tag === null`），
 * 挂载后才从地址栏恢复 `?tag=`。渲染期读 `window` / `useSearch()` 会让 Node 预渲染直接崩，
 * 而无 JS 的爬虫与分享预览必须仍然看得到全部文章。
 */
export function PressPage() {
  const [tag, setTag] = useState<string | null>(null)

  useEffect(() => setTag(parseTag(window.location.search)), [])

  const select = (next: string | null) => {
    setTag(next)
    const query = next ? `?tag=${encodeURIComponent(next)}` : ''
    window.history.replaceState(null, '', `/press/${query}`)
  }

  const tags = collectTags(newsPages)
  const visible = filterByTag(newsPages, tag)

  return (
    <>
      <PageHeader title="企业动态" description="记录产品演进、技术洞察、行业观点与团队故事。" />

      <Section id="press">
        <TagBar role="group" aria-label="按标签筛选">
          <TagButton
            type="button"
            $active={tag === null}
            aria-pressed={tag === null}
            onClick={() => select(null)}
          >
            全部
            <TagCount>{newsPages.length}</TagCount>
          </TagButton>
          {tags.map((item) => (
            <TagButton
              key={item.tag}
              type="button"
              $active={tag === item.tag}
              aria-pressed={tag === item.tag}
              onClick={() => select(item.tag)}
            >
              {item.tag}
              <TagCount>{item.count}</TagCount>
            </TagButton>
          ))}
        </TagBar>

        {visible.length > 0 ? (
          <Timeline>
            {visible.map((post, index) => (
              <TimelineEntry key={post.url} $delay={index % 3}>
                <DateMono>{post.frontmatter.date}</DateMono>
                <NewsCard $delay={index % 3}>
                  <h2>
                    <Link href={post.url}>{post.frontmatter.title}</Link>
                  </h2>
                  {post.frontmatter.description ? <p>{post.frontmatter.description}</p> : null}
                  {post.frontmatter.tags?.length ? (
                    <TagRow>
                      {post.frontmatter.tags.map((item) => (
                        <TagButton
                          key={item}
                          type="button"
                          $active={tag === item}
                          aria-pressed={tag === item}
                          onClick={() => select(item)}
                        >
                          {item}
                        </TagButton>
                      ))}
                    </TagRow>
                  ) : null}
                  <PostFoot>
                    {post.frontmatter.external_url ? (
                      <a
                        href={post.frontmatter.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        微信公众号原文
                        <ExternalLinkIcon width={14} height={14} />
                      </a>
                    ) : (
                      <span />
                    )}
                    <ReadMore>阅读 →</ReadMore>
                  </PostFoot>
                </NewsCard>
              </TimelineEntry>
            ))}
          </Timeline>
        ) : (
          <EmptyPanel $delay={1}>
            <h2>没有「{tag}」标签的动态</h2>
            <div>换一个标签，或者看看全部企业动态。</div>
            <TagButton type="button" onClick={() => select(null)}>
              查看全部
            </TagButton>
          </EmptyPanel>
        )}
      </Section>
    </>
  )
}
