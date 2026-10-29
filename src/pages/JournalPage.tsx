import { mergeClasses } from '@griffel/react'
import { Link } from 'wouter'
import { journalPages } from '../lib/content'
import { useSharedStyles } from '../styles/shared'

export function JournalPage() {
  const s = useSharedStyles()

  return (
    <section className={s.section} id="journal-list">
      <div className={s.reveal}>
        <h2>企业日志</h2>
        <p>记录产品演进、技术洞察、行业观点与团队故事。</p>
      </div>

      {journalPages.length > 0 ? (
        <div className={s.cardGrid}>
          {journalPages.map((post) => (
            <article key={post.url} className={mergeClasses(s.card, s.reveal, s.delay1)}>
              {post.frontmatter.date ? (
                <p className={mergeClasses(s.heroTag, s.cardTag)}>{post.frontmatter.date}</p>
              ) : null}
              <h4>
                <Link href={post.url}>{post.frontmatter.title}</Link>
              </h4>
              {post.frontmatter.description ? <p>{post.frontmatter.description}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className={mergeClasses(s.card, s.reveal, s.delay1)}>
          <h4>暂无日志</h4>
          <p>新的产品进展与技术洞察将在这里发布，敬请期待。</p>
        </div>
      )}
    </section>
  )
}
