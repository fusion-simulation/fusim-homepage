import { Fragment } from 'react'
import { mergeClasses } from '@griffel/react'
import { publications } from '../lib/publications'
import { useDataTreeStyles } from '../styles/publications'
import { useSharedStyles } from '../styles/shared'
import { DataTree } from '../components/DataTree'

export function PublicationsPage() {
  const s = useSharedStyles()
  const pub = useDataTreeStyles()

  return (
    <section className={s.section} id="publications">
      <div className={s.reveal}>
        <h2>论文发表</h2>
        <p>集中展示聚核智算的论文与技术报告（PDF）。</p>
      </div>

      {publications.length > 0 ? (
        publications.map((group) => (
          <Fragment key={group.year}>
            <div className={mergeClasses(s.reveal, s.delay1)}>
              <h3 className={s.yearHeading}>{group.year}</h3>
            </div>
            <div className={s.cardGrid}>
              {group.items.map((item) => (
                <article key={item.url} className={mergeClasses(s.card, s.reveal, s.delay1)}>
                  <h4>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h4>
                  <p className={s.meta}>{item.meta}</p>
                  {item.data.length > 0 ? (
                    <div className={pub.dataFiles}>
                      <strong>附加文件：</strong>
                      <DataTree nodes={item.data} />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Fragment>
        ))
      ) : (
        <div className={mergeClasses(s.card, s.reveal, s.delay1)}>
          <h4>暂无论文</h4>
          <p className={s.meta}>
            请将 PDF 放入 <code>assets/pub</code>
            （支持按年份/子目录归档）。放入同级目录中的其他任意类型文件（如 <code>.dat</code>,{' '}
            <code>.zip</code>）将自动作为数据文件供用户下载和展示。
          </p>
        </div>
      )}
    </section>
  )
}
