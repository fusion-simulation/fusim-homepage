import { TokamakScene } from '../components/TokamakScene'
import { site } from '../content/site'
import type { ContentPage } from '../lib/content'
import { productsOfSection } from '../lib/content'
import {
  HeroActions,
  HeroBackdrop,
  HeroContent,
  HeroEyebrow,
  HeroLead,
  HeroStage,
  HeroStat,
  HeroStatBar,
  HeroStatLabel,
  HeroStatValue,
  HeroTitle,
  ScrollCue,
} from '../styles/hero'
import {
  ConsoleBody,
  ConsoleReadout,
  ConsoleRow,
  CtaActions,
  CtaPanel,
  FlowBanner,
  FlowCol,
  FlowGrid,
  FlowHead,
  FlowStep,
  FlowSteps,
  PartnerBand,
  PartnerGroup,
  PartnerItem,
  PartnerTrack,
  ProductConsole,
  ProductFeatures,
  ProductSpot,
  ProductSpotActions,
  ProductSpotText,
  TechCard,
  TechDesc,
  TechGlyph,
  TechGrid,
  TechKicker,
  TechNo,
  TechPoints,
  VerifyCard,
  VerifyGrid,
  VerifyValue,
} from '../styles/home'
import {
  Band,
  BtnAnchor,
  BtnLink,
  ButtonIcon,
  CardGrid,
  CardLink,
  Eyebrow,
  SectionHead,
  Shell,
} from '../styles/shared'

/* ---------- 首屏数据带 ---------- */

const heroStats = [
  { value: '2.0×', label: '典型算例最高加速' },
  { value: '60%+', label: '仿真时间节省' },
  { value: '10+', label: '知识产权数量' },
  { value: '7', label: '高水平学术论文' },
]

/* ---------- 合作单位（依托 + 合作，来自 BP 公开信息） ---------- */

const partners = [
  { name: '华中科技大学聚变与等离子体研究所', role: '依托单位' },
  { name: '中国科学院等离子体物理研究所', role: '合作' },
  { name: '华为', role: '算力合作' },
  { name: '星能玄光', role: '合作' },
  { name: '新奥能源研究院', role: '合作' },
]

/* ---------- 三大核心技术 ---------- */

const techs = [
  {
    no: '01',
    kicker: '算得快',
    sub: '自主求解器 × 国产异构算力',
    desc: '自主研发全系列聚变求解器，深度适配国产异构算力，典型算例最高加速 2.0×，解决「算不快、受制于人」。',
    points: [
      '平衡 / 磁流体 / 输运 / 粒子 / 壁面全系列求解器',
      '国产异构算力深度优化',
      '自主知识产权 · 代码自主可控',
    ],
    featured: false,
  },
  {
    no: '02',
    kicker: '算得准',
    sub: '聚变专用物理模型 + 多物理场耦合',
    desc: '聚变专用物理模型矩阵与多物理场耦合显著提升结果可靠度，仿真与实验的关键指标一致。',
    points: ['平衡 / 输运 / 加热 / 壁面 / 破裂专用模型', '多物理场自洽耦合', '中科院合作实验验证'],
    featured: false,
  },
  {
    no: '03',
    kicker: '用得简单',
    sub: '聚变 Agent + 仿真工作流平台',
    desc: '自然语言驱动的一体化工作流，让聚变仿真从专家工具走向工程生产工具。',
    points: [
      '自然语言需求 → Agent 自动构建算例',
      '自动选算力 · 运行求解器 · 分析结果',
      '算例沉淀复用 · 流程可追溯',
    ],
    featured: true,
  },
]

/** 三大技术卡右上角的能力图形。 */
function TechGlyphIcon({ index }: { index: number }) {
  if (index === 0) {
    // 算得快：叠加的速度弧
    return (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M8 34a16 16 0 0 1 32 0" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        <path d="M14 34a10 10 0 0 1 20 0" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 34l8-10" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="34" r="2.6" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (index === 1) {
    // 算得准：同心靶环 + 十字
    return (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="24" cy="24" r="17" strokeWidth="2" opacity="0.35" />
        <circle cx="24" cy="24" r="10" strokeWidth="2" opacity="0.7" />
        <circle cx="24" cy="24" r="3.4" fill="currentColor" stroke="none" />
        <path d="M24 3v8M24 37v8M3 24h8M37 24h8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  // 用得简单：节点流
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="5" y="19" width="11" height="11" rx="3" strokeWidth="2" />
      <rect x="32" y="6" width="11" height="11" rx="3" strokeWidth="2" opacity="0.5" />
      <rect x="32" y="32" width="11" height="11" rx="3" strokeWidth="2" opacity="0.5" />
      <path
        d="M16 24.5h8m0 0c6 0 4-13 8-13m-8 13c6 0 4 13.5 8 13.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ---------- 工作流对比 ---------- */

const legacySteps = [
  '命令行操作',
  '手工修改参数',
  '手工提交任务',
  '盲目等待结果',
  '下载与整理数据',
  '人工分析、难以复用',
]
const agentSteps = [
  '自然语言描述需求',
  'Agent 自动构建算例',
  '自动参数检查',
  '智能选择算力',
  '自动运行与分析',
  '算例沉淀复用',
]

/* ---------- 成果验证 ---------- */

const verifications = [
  {
    source: 'SCIENCE ADVANCES',
    value: '',
    title: '团队成员担任独立第一作者',
    desc: 'EAST 欧姆起动过程研究成果发表于 Science Advances，仿真与实验结果一致。',
  },
  {
    source: 'ASIPP · 中科院等离子体所',
    value: '',
    title: '仿真-实验关键指标一致',
    desc: '合作完成杂质注入与托卡马克破裂过程模拟，提高未来聚变堆安全性能。',
  },
  {
    source: 'HUAWEI · 华为',
    value: '200%',
    title: '国产算力平台性能提升',
    desc: '在华为超算平台速度优于 Intel 平台 200%，首次实现国产聚变程序与国产算力适配。',
  },
]

/* ---------- 产品 ---------- */

function ProductCard({ product }: { product: ContentPage }) {
  const { frontmatter } = product
  const description = frontmatter.desp ?? frontmatter.description

  return (
    <CardLink href={product.url} $delay={1}>
      <h4>{frontmatter.title}</h4>
      {description ? <p>{description}</p> : null}
    </CardLink>
  )
}

export function HomePage() {
  const services = productsOfSection('service')

  return (
    <>
      {/* ---------- 首屏：全屏等离子体场景 ---------- */}
      <HeroStage>
        <HeroBackdrop aria-hidden="true">
          <TokamakScene />
        </HeroBackdrop>

        <HeroContent>
          <HeroEyebrow>FUSIM · 聚核智算</HeroEyebrow>
          <HeroTitle>
            打造聚变堆系统的
            <em>数字孪生设施</em>
          </HeroTitle>
          <HeroLead>{site.description}</HeroLead>
          <HeroActions $delay={3}>
            <BtnLink href="/products/" $variant="primary">
              查看产品矩阵
            </BtnLink>
            <BtnAnchor $variant="light" href="https://docs.fusim.cn/">
              访问产品文档
              <ButtonIcon />
            </BtnAnchor>
          </HeroActions>
        </HeroContent>

        <ScrollCue $delay={4}>SCROLL</ScrollCue>
      </HeroStage>

      {/* 数据带：两端一致，落在折叠线以下 */}
      <HeroStatBar $delay={2}>
        <div>
          {heroStats.map((stat) => (
            <HeroStat key={stat.label}>
              <HeroStatValue>{stat.value}</HeroStatValue>
              <HeroStatLabel>{stat.label}</HeroStatLabel>
            </HeroStat>
          ))}
        </div>
      </HeroStatBar>

      {/* ---------- 依托与合作 ---------- */}
      <PartnerBand aria-label="依托单位与合作机构">
        <PartnerTrack>
          {[0, 1].map((group) => (
            <PartnerGroup key={group} aria-hidden={group === 1}>
              {partners.map((partner) => (
                <PartnerItem key={`${group}-${partner.name}`}>
                  <strong>{partner.name}</strong>
                  {partner.role}
                </PartnerItem>
              ))}
            </PartnerGroup>
          ))}
        </PartnerTrack>
      </PartnerBand>

      {/* ---------- 三大核心技术 ---------- */}
      <Band id="tech">
        <Shell>
          <SectionHead>
            <Eyebrow>CORE TECHNOLOGY</Eyebrow>
            <h2>一个平台，三重突破</h2>
            <p>
              算得快、算得准、用得简单——聚核智算用三条技术主线，把聚变仿真从科研奢侈品变成工程生产力。
            </p>
          </SectionHead>

          <TechGrid>
            {techs.map((tech, index) => (
              <TechCard key={tech.no} $delay={index + 1} $featured={tech.featured}>
                <TechNo>{tech.no}</TechNo>
                <TechGlyph aria-hidden="true">
                  <TechGlyphIcon index={index} />
                </TechGlyph>
                <TechKicker>
                  {tech.kicker}
                  <small>{tech.sub}</small>
                </TechKicker>
                <TechDesc>{tech.desc}</TechDesc>
                <TechPoints>
                  {tech.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </TechPoints>
              </TechCard>
            ))}
          </TechGrid>
        </Shell>
      </Band>

      {/* ---------- 工作流对比 ---------- */}
      <Band id="workflow" $tint $hairline>
        <Shell>
          <SectionHead>
            <Eyebrow>WORKFLOW</Eyebrow>
            <h2>从命令行到一句话</h2>
            <p>CBaldur 以 Agent 驱动仿真全流程：需求描述、算例构建、算力调度、结果分析一气呵成。</p>
          </SectionHead>

          <FlowGrid $delay={1}>
            <FlowCol>
              <FlowHead>
                <strong>传统流程</strong>
                <span>LEGACY</span>
              </FlowHead>
              <FlowSteps>
                {legacySteps.map((step, index) => (
                  <FlowStep key={step}>
                    <i>{index + 1}</i>
                    {step}
                  </FlowStep>
                ))}
              </FlowSteps>
            </FlowCol>

            <FlowCol $new>
              <FlowHead $new>
                <strong>CBaldur 工作流</strong>
                <span>AGENT-DRIVEN</span>
              </FlowHead>
              <FlowSteps>
                {agentSteps.map((step, index) => (
                  <FlowStep key={step} $new>
                    <i>{index + 1}</i>
                    {step}
                  </FlowStep>
                ))}
              </FlowSteps>
            </FlowCol>
          </FlowGrid>

          <FlowBanner $delay={2}>
            以小时计的传统准备流程，压缩到分钟级——
            <strong>节省用户 60%+ 时间</strong>
          </FlowBanner>
        </Shell>
      </Band>

      {/* ---------- 产品矩阵 ---------- */}
      <Band id="matrix">
        <Shell>
          <SectionHead>
            <Eyebrow>PRODUCTS</Eyebrow>
            <h2>产品矩阵</h2>
            <p>覆盖聚变物理与工程仿真的核心工具链，以及面向装置的定制化仿真方案。</p>
          </SectionHead>

          <ProductSpot $delay={1}>
            <ProductSpotText>
              <Eyebrow>SAAS · FLAGSHIP</Eyebrow>
              <h3>CBaldur</h3>
              <p>1.5D 磁约束聚变集成模拟软件，覆盖从平衡到输运的完整物理链条。</p>
              <ProductFeatures>
                <li>全系列求解器集成：平衡 / 磁流体 / 输运 / 粒子 / 壁面</li>
                <li>云端 SaaS 化运行，算力统一分配与任务调度</li>
                <li>企业级数据安全与算例资产沉淀</li>
              </ProductFeatures>
              <ProductSpotActions>
                <BtnAnchor $variant="primary" href="https://cbaldur.fusim.cn">
                  访问产品站点
                  <ButtonIcon />
                </BtnAnchor>
                <BtnAnchor $variant="light" href="https://docs.fusim.cn/">
                  查看产品文档
                </BtnAnchor>
              </ProductSpotActions>
            </ProductSpotText>

            <ProductConsole aria-hidden="true">
              <header>
                <i />
                <i />
                <i />
                <span>CBALDUR · SIM</span>
              </header>
              <ConsoleBody>
                <ConsoleReadout>
                  <div>
                    <strong>1.5D</strong>
                    <span>INTEGRATED</span>
                  </div>
                  <div>
                    <strong>MHD</strong>
                    <span>SOLVER</span>
                  </div>
                  <div>
                    <strong>EQUIL</strong>
                    <span>FIELD</span>
                  </div>
                </ConsoleReadout>
                <ConsoleRow $w={92} />
                <ConsoleRow $w={76} />
                <ConsoleRow $w={84} />
                <ConsoleRow $w={58} />
              </ConsoleBody>
            </ProductConsole>
          </ProductSpot>

          {services.length > 0 ? (
            <>
              <Eyebrow>SERVICE · 仿真方案</Eyebrow>
              <CardGrid>
                {services.map((product) => (
                  <ProductCard key={product.url} product={product} />
                ))}
              </CardGrid>
            </>
          ) : null}
        </Shell>
      </Band>

      {/* ---------- 成果验证 ---------- */}
      <Band id="evidence" $tint>
        <Shell>
          <SectionHead>
            <Eyebrow>EVIDENCE</Eyebrow>
            <h2>拿得出手的验证</h2>
            <p>成果经过顶级期刊、国家级科研平台与头部企业检验。</p>
          </SectionHead>

          <VerifyGrid>
            {verifications.map((item, index) => (
              <VerifyCard key={item.source} $delay={index + 1}>
                <em>{item.source}</em>
                {item.value ? <VerifyValue>{item.value}</VerifyValue> : null}
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </VerifyCard>
            ))}
          </VerifyGrid>
        </Shell>
      </Band>

      {/* ---------- CTA ---------- */}
      <Band id="contact">
        <Shell>
          <CtaPanel $delay={1}>
            <h2>
              让每一次聚变仿真
              <br />
              更快、更准、更简单
            </h2>
            <p>业务合作 / 方案咨询 / 媒体联络，欢迎与聚核智算聊聊。</p>
            <CtaActions>
              <BtnAnchor $variant="primary" href={`mailto:${site.email}`}>
                预约合作
              </BtnAnchor>
              <BtnAnchor $variant="light" href="https://docs.fusim.cn/">
                访问产品文档
                <ButtonIcon />
              </BtnAnchor>
            </CtaActions>
          </CtaPanel>
        </Shell>
      </Band>
    </>
  )
}
