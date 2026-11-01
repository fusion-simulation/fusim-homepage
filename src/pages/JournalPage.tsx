import { Link } from 'wouter'
import { PageHeader } from '../components/PageHeader'
import { journalPages } from '../lib/content'
import { Card, CardGrid, CardTag, Reveal, Section } from '../styles/shared'

export function JournalPage() {
  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="企业日志"
        description="记录产品演进、技术洞察、行业观点与团队故事。"
      />

      <Section id="journal-list">
        {journalPages.length > 0 ? (
          <CardGrid>
            {journalPages.map((post) => (
              <Card as="article" key={post.url} $delay={1}>
                {post.frontmatter.date ? <CardTag>{post.frontmatter.date}</CardTag> : null}
                <h4>
                  <Link href={post.url}>{post.frontmatter.title}</Link>
                </h4>
                {post.frontmatter.description ? <p>{post.frontmatter.description}</p> : null}
              </Card>
            ))}
          </CardGrid>
        ) : (
          <Reveal>
            <Card $delay={1}>
              <h4>暂无日志</h4>
              <p>新的产品进展与技术洞察将在这里发布，敬请期待。</p>
            </Card>
          </Reveal>
        )}
      </Section>
    </>
  )
}
