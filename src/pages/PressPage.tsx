import { mergeClasses } from '@griffel/react'
import { site } from '../content/site'
import { useSharedStyles } from '../styles/shared'

export function PressPage() {
  const s = useSharedStyles()

  return (
    <section className={s.section} id="press">
      <div className={s.reveal}>
        <h2>社会报导</h2>
      </div>

      {site.reports.length > 0 ? (
        <div className={s.cardGrid}>
          {site.reports.map((item) => (
            <article key={item.url} className={mergeClasses(s.card, s.reveal, s.delay1)}>
              <h4>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </h4>
              <p className={s.meta}>{item.date}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className={mergeClasses(s.card, s.reveal, s.delay1)}>
          <h4>暂无报导</h4>
          <p>请在页面顶部 YAML 中添加 reports 数据。</p>
        </div>
      )}
    </section>
  )
}
