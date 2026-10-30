import { Fragment } from 'react'
import { DataTree } from '../components/DataTree'
import { publications } from '../lib/publications'
import { useDataTreeStyles } from '../styles/publications'
import { Card, CardGrid, Meta, Reveal, Section, YearHeading } from '../styles/shared'

export function PublicationsPage() {
  const pub = useDataTreeStyles()

  return (
    <Section id="publications">
      <Reveal>
        <h2>论文发表</h2>
        <p>集中展示聚核智算的论文与技术报告（PDF）。</p>
      </Reveal>

      {publications.length > 0 ? (
        publications.map((group) => (
          <Fragment key={group.year}>
            <Reveal $delay={1}>
              <YearHeading>{group.year}</YearHeading>
            </Reveal>
            <CardGrid>
              {group.items.map((item) => (
                <Card as="article" key={item.url} $delay={1}>
                  <h4>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h4>
                  <Meta>{item.meta}</Meta>
                  {item.data.length > 0 ? (
                    <div className={pub.dataFiles}>
                      <strong>附加文件：</strong>
                      <DataTree nodes={item.data} />
                    </div>
                  ) : null}
                </Card>
              ))}
            </CardGrid>
          </Fragment>
        ))
      ) : (
        <Card $delay={1}>
          <h4>暂无论文</h4>
          <Meta>
            请将 PDF 放入 <code>assets/pub</code>
            （支持按年份/子目录归档）。放入同级目录中的其他任意类型文件（如 <code>.dat</code>,{' '}
            <code>.zip</code>）将自动作为数据文件供用户下载和展示。
          </Meta>
        </Card>
      )}
    </Section>
  )
}
