import { ExternalLinkIcon } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { site } from '../content/site'
import {
  DateMono,
  EmptyPanel,
  PressCardAnchor,
  PressCardLink,
  PressHint,
  PressSource,
  Timeline,
  TimelineEntry,
} from '../styles/hub'
import { Section } from '../styles/shared'

export function PressPage() {
  return (
    <>
      <PageHeader title="社会报导" description="媒体对聚核智算及相关技术进展的报道与专题。" />

      <Section id="press">
        {site.reports.length > 0 ? (
          <Timeline>
            {site.reports.map((item, index) => {
              const isExternal = /^https?:\/\//.test(item.url)
              // 站内专题走 wouter（不整页刷新），外部报导才用 target=_blank
              const body = (
                <>
                  <PressSource>
                    {isExternal ? '外部报道' : '站内专题'}
                    {isExternal ? <ExternalLinkIcon /> : null}
                  </PressSource>
                  <h2>{item.title}</h2>
                  <PressHint>{isExternal ? '在新窗口打开 →' : '查看专题 →'}</PressHint>
                </>
              )

              return (
                <TimelineEntry key={item.url} $delay={index % 3}>
                  <DateMono>{item.date}</DateMono>
                  {isExternal ? (
                    <PressCardAnchor href={item.url} target="_blank" rel="noopener noreferrer">
                      {body}
                    </PressCardAnchor>
                  ) : (
                    <PressCardLink href={item.url}>{body}</PressCardLink>
                  )}
                </TimelineEntry>
              )
            })}
          </Timeline>
        ) : (
          <EmptyPanel $delay={1}>
            <h2>暂无报导</h2>
            <div>请在页面顶部 YAML 中添加 reports 数据。</div>
          </EmptyPanel>
        )}
      </Section>
    </>
  )
}
