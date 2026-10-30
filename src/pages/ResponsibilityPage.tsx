import { Card, Reveal, Section, Split, Timeline, TimelineItem } from '../styles/shared'

export function ResponsibilityPage() {
  return (
    <Section id="responsibility">
      <Reveal>
        <h2>企业责任</h2>
        <p>我们以绿色算力、开放协作与人才成长作为核心责任方向，持续投入社会与生态建设。</p>
      </Reveal>
      <Split>
        <Card $delay={1}>
          <h4>绿色算力计划</h4>
          <p>推进低碳数据中心、能源协同与算力效率优化，减少每单位算力消耗。</p>
        </Card>
        <Card $delay={2}>
          <h4>教育与科研支持</h4>
          <p>开放算力资源与行业工具包，支持高校与科研团队探索创新。</p>
        </Card>
      </Split>
      <Timeline>
        <TimelineItem $delay={1}>
          <span>2023</span>
          <p>建立行业联合实验室，推动企业与高校共研。</p>
        </TimelineItem>
        <TimelineItem $delay={2}>
          <span>2024</span>
          <p>完成多地绿色算力枢纽布局与认证。</p>
        </TimelineItem>
        <TimelineItem $delay={3}>
          <span>2025</span>
          <p>发布企业责任报告与算力可持续路线图。</p>
        </TimelineItem>
      </Timeline>
    </Section>
  )
}
