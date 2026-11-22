import { Link } from 'wouter'
import { PageHeader } from '../components/PageHeader'
import { journalPages } from '../lib/content'
import {
  DateMono,
  EmptyPanel,
  FeatureLabel,
  JournalFeature,
  PostCard,
  PostFoot,
  PostGrid,
  ReadMore,
} from '../styles/hub'
import { Section } from '../styles/shared'

export function JournalPage() {
  const [featured, ...rest] = journalPages

  return (
    <>
      <PageHeader title="公司新闻" description="记录产品演进、技术洞察、行业观点与团队故事。" />

      <Section id="journal-list">
        {featured ? (
          <>
            <JournalFeature>
              <FeatureLabel>Latest</FeatureLabel>
              <h2>
                <Link href={featured.url}>{featured.frontmatter.title}</Link>
              </h2>
              {featured.frontmatter.description ? <p>{featured.frontmatter.description}</p> : null}
              <PostFoot>
                {featured.frontmatter.date ? (
                  <DateMono>{featured.frontmatter.date}</DateMono>
                ) : (
                  <span />
                )}
                <ReadMore>阅读全文 →</ReadMore>
              </PostFoot>
            </JournalFeature>

            {rest.length > 0 ? (
              <PostGrid>
                {rest.map((post, index) => (
                  <PostCard key={post.url} $delay={index % 3}>
                    <DateMono>{String(index + 2).padStart(2, '0')}</DateMono>
                    <h3>
                      <Link href={post.url}>{post.frontmatter.title}</Link>
                    </h3>
                    {post.frontmatter.description ? <p>{post.frontmatter.description}</p> : null}
                    <PostFoot>
                      {post.frontmatter.date ? (
                        <DateMono>{post.frontmatter.date}</DateMono>
                      ) : (
                        <span />
                      )}
                      <ReadMore>阅读 →</ReadMore>
                    </PostFoot>
                  </PostCard>
                ))}
              </PostGrid>
            ) : null}
          </>
        ) : (
          <EmptyPanel $delay={1}>
            <h2>暂无公司新闻</h2>
            <div>新的产品进展与技术洞察将在这里发布，敬请期待。</div>
          </EmptyPanel>
        )}
      </Section>
    </>
  )
}
