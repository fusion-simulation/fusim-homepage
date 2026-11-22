import { styled } from 'styled-components'
import { PageHeader } from '../components/PageHeader'
import { site } from '../content/site'
import { type RevealProps, reveal } from '../styles/animation'
import { containers, fromContainer } from '../styles/responsive'
import { Band, BtnLink, Eyebrow, SectionHead, Shell } from '../styles/shared'

const businesses = [
  {
    no: '01',
    title: '标准软件产品',
    desc: '以 CBaldur 为核心，将聚变物理模型、数值求解器与云端工作流整合为可部署、可持续维护的软件产品。',
    meta: '模块化授权 · SaaS 订阅 · 私有化部署',
  },
  {
    no: '02',
    title: '工程仿真解决方案',
    desc: '围绕装置设计、运行窗口优化、实验分析与安全评估，提供软件、专家与算力协同的仿真服务。',
    meta: '需求分析 · 模型验证 · 工程交付',
  },
  {
    no: '03',
    title: '重大工程数字化服务',
    desc: '面向重大工程的长期需求，提供物理仿真引擎、数字化工作流与持续技术支持。',
    meta: '平台支撑 · 数字孪生 · 长期服务',
  },
] as const

const workflow = [
  {
    no: '01',
    title: '物理建模',
    desc: '从真实装置与科研问题出发，构建面向聚变场景的专用物理模型。',
  },
  {
    no: '02',
    title: '自主求解',
    desc: '以自主求解器和多物理过程耦合，兼顾计算效率、稳定性与物理一致性。',
  },
  {
    no: '03',
    title: '云端运行',
    desc: '通过浏览器完成任务配置、算力调度与结果可视化，降低部署和协作门槛。',
  },
  {
    no: '04',
    title: '智能辅助',
    desc: '以聚变 Agent 辅助算例创建、参数校验、任务执行和结果分析。',
  },
] as const

const IntroGrid = styled.div`
  display: grid;
  gap: 40px;
  align-items: center;

  ${fromContainer(containers.shell, 'split')} {
    grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
    gap: clamp(48px, 7cqi, 88px);
  }
`

const IntroCopy = styled.div`
  display: grid;
  gap: 22px;

  & h2 {
    max-width: 680px;
    font-size: clamp(2rem, 3.4cqi, 3rem);
    line-height: 1.3;
    letter-spacing: 0.02em;
  }

  & p {
    max-width: 680px;
    color: var(--text-muted);
    font-size: 1.02rem;
    line-height: 1.95;
  }
`

const MissionPanel = styled.div<RevealProps>`
  ${reveal}
  position: relative;
  padding: clamp(28px, 4cqi, 42px);
  border: 1px solid var(--line-strong);
  background:
    radial-gradient(100% 70% at 100% 0%, rgba(var(--accent-rgb), 0.1), transparent 70%),
    var(--bg-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 2px;
    background: linear-gradient(180deg, var(--accent), transparent 85%);
  }

  & > h3 {
    margin-top: 16px;
    font-size: clamp(1.45rem, 2.4cqi, 2rem);
    line-height: 1.45;
  }
`

const MissionList = styled.ol`
  list-style: none;
  display: grid;
  gap: 0;
  margin-top: 30px;

  & li {
    position: relative;
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 16px;
    padding: 18px 0;
    border-top: 1px solid var(--line);
  }

  & li > span {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    color: var(--accent-ink);
    padding-top: 3px;
  }

  & strong {
    display: block;
    font-size: 1.02rem;
    letter-spacing: 0.03em;
  }

  & small {
    display: block;
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.6;
  }
`

const BusinessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 20px;

  ${fromContainer(containers.shell, 'threeUp')} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const BusinessCard = styled.article<RevealProps>`
  ${reveal}
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 30px 28px;
  border: 1px solid var(--line);
  background: var(--bg-card);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
    box-shadow: var(--shadow-card);
  }

  & > span {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.18em;
    color: var(--accent-ink);
  }

  & h3 {
    margin-top: 34px;
    font-size: 1.3rem;
    line-height: 1.45;
  }

  & p {
    margin-top: 14px;
    color: var(--text-muted);
    line-height: 1.85;
  }

  & footer {
    margin-top: auto;
    padding-top: 24px;
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.7;
    letter-spacing: 0.04em;
  }
`

const WorkflowList = styled.ol`
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  border-top: 1px solid var(--line-strong);

  ${fromContainer(containers.shell, 'threeUp')} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const WorkflowStep = styled.li<RevealProps>`
  ${reveal}
  position: relative;
  padding: 30px 24px 8px 0;

  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 0;
    width: 9px;
    height: 9px;
    background: var(--accent);
    transform: rotate(45deg);
  }

  & > span {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-muted);
    letter-spacing: 0.18em;
  }

  & h3 {
    margin-top: 18px;
    font-size: 1.2rem;
  }

  & p {
    margin-top: 12px;
    max-width: 280px;
    color: var(--text-muted);
    font-size: 0.93rem;
    line-height: 1.8;
  }
`

const AboutCta = styled.div<RevealProps>`
  ${reveal}
  position: relative;
  padding: clamp(36px, 7cqi, 68px) clamp(24px, 7cqi, 72px);
  border: 1px solid var(--line-strong);
  background:
    radial-gradient(70% 140% at 50% 0%, rgba(var(--accent-rgb), 0.12), transparent 65%),
    var(--bg-deep);
  text-align: center;
  overflow: hidden;

  & h2 {
    margin-top: 18px;
    font-size: clamp(2rem, 4cqi, 3.2rem);
    letter-spacing: 0.06em;
  }

  & > p {
    max-width: 660px;
    margin: 18px auto 0;
    color: var(--text-muted);
    line-height: 1.85;
  }
`

const ProductTags = styled.ul`
  list-style: none;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;

  & li {
    padding: 8px 13px;
    border: 1px solid var(--line);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    letter-spacing: 0.04em;
  }
`

const CtaActions = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 32px;
`

export function AboutPage() {
  return (
    <>
      <PageHeader
        title="关于我们"
        description="聚核智算专注于聚变仿真工业软件与工程数字化服务，让前沿物理研究成为可部署、可验证、可持续演进的工程能力。"
      />

      <Band id="company">
        <Shell>
          <IntroGrid>
            <IntroCopy>
              <Eyebrow>WHO WE ARE</Eyebrow>
              <h2>为聚变工程，构建可信的数字仿真底座</h2>
              <p>
                聚核智算（武汉）科技有限公司面向聚变装置设计、实验优化、运行分析和工程验证需求，研发聚变专用工业软件，为科研机构、聚变企业与重大工程主体提供计算模型、软件工具和工程分析能力。
              </p>
              <p>
                我们以自主求解器及聚变物理模型为基础，结合多物理过程耦合、国产异构算力适配、聚变
                Agent 与仿真工作流，推动科研计算能力向工程软件转化。
              </p>
            </IntroCopy>

            <MissionPanel $delay={1}>
              <Eyebrow>OUR MISSION</Eyebrow>
              <h3>{site.slogan2}</h3>
              <MissionList>
                <li>
                  <span>01</span>
                  <div>
                    <strong>可信计算模型</strong>
                    <small>以物理研究与实验验证支撑仿真结果</small>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>工程仿真软件</strong>
                    <small>让模型与算法成为可复用的软件能力</small>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>持续技术服务</strong>
                    <small>陪伴科研与工程需求持续演进</small>
                  </div>
                </li>
              </MissionList>
            </MissionPanel>
          </IntroGrid>
        </Shell>
      </Band>

      <Band id="business" $tint $hairline>
        <Shell>
          <SectionHead>
            <Eyebrow>WHAT WE DO</Eyebrow>
            <h2>从标准产品到工程服务</h2>
            <p>围绕同一客户的设计、实验与运行环节，形成可持续交付、可复用沉淀的业务体系。</p>
          </SectionHead>

          <BusinessGrid>
            {businesses.map((item, index) => (
              <BusinessCard key={item.no} $delay={index}>
                <span>{item.no}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <footer>{item.meta}</footer>
              </BusinessCard>
            ))}
          </BusinessGrid>
        </Shell>
      </Band>

      <Band id="approach">
        <Shell>
          <SectionHead>
            <Eyebrow>HOW WE WORK</Eyebrow>
            <h2>连接物理、计算与工程工作流</h2>
            <p>从科研问题到工程结果，每一步都围绕可信、易用与协作展开。</p>
          </SectionHead>

          <WorkflowList>
            {workflow.map((item, index) => (
              <WorkflowStep key={item.no} $delay={index}>
                <span>STEP {item.no}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </WorkflowStep>
            ))}
          </WorkflowList>
        </Shell>
      </Band>

      <Band id="product">
        <Shell>
          <AboutCta $delay={1}>
            <Eyebrow>CORE PRODUCT</Eyebrow>
            <h2>CBaldur</h2>
            <p>
              聚核智算现阶段的核心产品，是面向磁约束聚变的 1.5D
              集成模拟软件，承载托卡马克集成模拟与云端仿真工作流能力。
            </p>
            <ProductTags aria-label="CBaldur 产品特点">
              <li>1.5D 集成模拟</li>
              <li>云端工作流</li>
              <li>Agent 智能辅助</li>
            </ProductTags>
            <CtaActions>
              <BtnLink href="/products/" $variant="primary">
                查看产品矩阵
              </BtnLink>
              <BtnLink href="/contact/" $variant="secondary">
                预约合作
              </BtnLink>
            </CtaActions>
          </AboutCta>
        </Shell>
      </Band>
    </>
  )
}
