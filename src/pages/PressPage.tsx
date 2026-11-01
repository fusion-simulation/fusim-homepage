import { PageHeader } from '../components/PageHeader'
import { site } from '../content/site'
import { Card, CardGrid, Meta, Reveal, Section } from '../styles/shared'

export function PressPage() {
  return (
    <>
      <PageHeader eyebrow="Press" title="社会报导" />

      <Section id="press">
        {site.reports.length > 0 ? (
          <CardGrid>
            {site.reports.map((item) => (
              <Card as="article" key={item.url} $delay={1}>
                <h4>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                </h4>
                <Meta>{item.date}</Meta>
              </Card>
            ))}
          </CardGrid>
        ) : (
          <Reveal>
            <Card $delay={1}>
              <h4>暂无报导</h4>
              <p>请在页面顶部 YAML 中添加 reports 数据。</p>
            </Card>
          </Reveal>
        )}
      </Section>
    </>
  )
}
