import { mergeClasses } from '@griffel/react'
import type { ContentPage } from '../lib/content'
import { useProseStyles } from '../styles/prose'
import { useSharedStyles } from '../styles/shared'

export function MdxPage({ page }: { page: ContentPage }) {
  const prose = useProseStyles()
  const s = useSharedStyles()
  const { Component, frontmatter, kind } = page

  if (kind === 'journal') {
    return (
      <section className={s.section} id="journal-post">
        <div className={s.reveal}>
          <p className={s.heroTag}>企业日志</p>
          <h1>{frontmatter.title}</h1>
          <p className={s.meta}>{frontmatter.date}</p>
        </div>
        <article
          className={mergeClasses(s.card, s.reveal, s.delay1)}
          style={{ marginTop: 24 }}
        >
          <Component />
        </article>
      </section>
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
