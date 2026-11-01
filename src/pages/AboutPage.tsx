import { PageHeader } from '../components/PageHeader'
import { Card, Quote, Section, Split } from '../styles/shared'

export function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About FUSIM"
        title="企业介绍"
        description="聚核智算（FUSIM）致力于打造可持续的智能算力网络，以「稳态算力 + 弹性平台 + 行业策略」为核心架构，为聚变等离子体的科学计算和模拟等场景提供端到端智算服务。"
      />

      <Section>
        <Split>
          <Card $delay={1}>
            <h4>核心能力</h4>
            <ul>
              <li>强大完善的核心求解器</li>
              <li>高密度算力调度与优化</li>
              <li>方便简单快捷的云端平台</li>
            </ul>
          </Card>
          <Card $delay={2}>
            <h4>服务架构</h4>
            <p>以算力供给层、平台治理层与行业应用层形成闭环服务，确保算力被业务理解与调度。</p>
            <Quote>“让算力成为企业创新的可编程底座。”</Quote>
          </Card>
        </Split>
      </Section>
    </>
  )
}
