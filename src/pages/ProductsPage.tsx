import { PageHeader } from '../components/PageHeader'
import {
  cellAccessibilityText,
  compute,
  coverage,
  evidence,
  legend,
  processes,
  solvers,
} from '../content/product-matrix'
import { type ContentPage, contentPageByUrl } from '../lib/content'
import {
  CellLabel,
  ComputeRow,
  CoverageBar,
  CoverageCell,
  DeliveryCell,
  DeviceCard,
  DeviceGrid,
  DeviceTags,
  EvidenceGrid,
  EvidenceItem,
  ExitActions,
  ExitBand,
  Legend,
  MatrixAction,
  MatrixBand,
  MatrixHead,
  MatrixHeadBlock,
  MatrixList,
  MatrixRow,
  OverviewBand,
  ProcessCell,
  SolverCell,
  SolverStrip,
  StateDot,
} from '../styles/matrix'
import {
  Band,
  BtnAnchor,
  BtnLink,
  ButtonIcon,
  Eyebrow,
  SectionHead,
  Shell,
  SrOnly,
} from '../styles/shared'

/** 两列的列名。窄屏由 CellLabel 显示，宽屏由列头显示；两者都用这份常量，避免漂移。 */
const SAAS_LABEL = '标准产品 · CBaldur'
const SERVICE_LABEL = '工程仿真方案'

/** 装置方案页的文案只从 MDX frontmatter 取，不在这里复制一份。 */
function devicePage(url: string): ContentPage {
  const page = contentPageByUrl.get(url)
  if (!page) throw new Error(`产品矩阵引用了不存在的装置方案页：${url}`)
  return page
}

const tokamak = devicePage('/products/service_tokamak/')
const frc = devicePage('/products/service_frc/')

export function ProductsPage() {
  return (
    <>
      <PageHeader
        title="产品矩阵"
        description="哪些过程能算、哪些装置上算过，两种交付形态各交付什么。"
      />

      <OverviewBand>
        <CoverageBar>
          <CoverageCell>
            <dt>物理过程</dt>
            <dd>
              {coverage.processes}
              <span>类</span>
            </dd>
          </CoverageCell>
          <CoverageCell>
            <dt>自主求解器</dt>
            <dd>
              {coverage.solvers}
              <span>类</span>
            </dd>
          </CoverageCell>
          <CoverageCell>
            <dt>装置</dt>
            <dd>
              {coverage.devices}
              <span>类</span>
            </dd>
          </CoverageCell>
          <CoverageCell>
            <dt>合作验证</dt>
            <dd>
              {coverage.evidence}
              <span>家</span>
            </dd>
          </CoverageCell>
        </CoverageBar>
      </OverviewBand>

      {/* ---------- 覆盖矩阵 ---------- */}
      <MatrixBand>
        <Shell>
          <MatrixHeadBlock>
            <Eyebrow>COVERAGE</Eyebrow>
            <h2>覆盖矩阵</h2>
            <p>行是物理过程，两列是交付形态；装置列是有案例支撑的对象。</p>
          </MatrixHeadBlock>

          <MatrixHead aria-hidden="true">
            <span>物理过程</span>
            <span>{SAAS_LABEL}</span>
            <span>{SERVICE_LABEL}</span>
            <span>装置 / 案例</span>
          </MatrixHead>

          <MatrixList>
            {processes.map((process, index) => (
              <MatrixRow key={process.key} $delay={index % 4}>
                <ProcessCell>
                  <span>{process.no}</span>
                  <h3>{process.label}</h3>
                  <p>{process.summary}</p>
                </ProcessCell>

                <DeliveryCell $state={process.saas.state} role="group" aria-label={SAAS_LABEL}>
                  <CellLabel aria-hidden="true">{SAAS_LABEL}</CellLabel>
                  <SrOnly>{cellAccessibilityText(process.saas)}</SrOnly>
                  <StateDot $state={process.saas.state} aria-hidden="true" />
                  <p>{process.saas.text}</p>
                </DeliveryCell>

                <DeliveryCell
                  $state={process.service.state}
                  role="group"
                  aria-label={SERVICE_LABEL}
                >
                  <CellLabel aria-hidden="true">{SERVICE_LABEL}</CellLabel>
                  <SrOnly>{cellAccessibilityText(process.service)}</SrOnly>
                  <StateDot $state={process.service.state} aria-hidden="true" />
                  <p>{process.service.text}</p>
                </DeliveryCell>

                <DeviceTags>
                  <CellLabel aria-hidden="true">装置 / 案例</CellLabel>
                  <div>
                    {process.devices.map((device) => (
                      <span key={device}>{device}</span>
                    ))}
                  </div>
                </DeviceTags>
              </MatrixRow>
            ))}
          </MatrixList>

          <Legend>
            {legend.map((item) => (
              <li key={item.state}>
                <StateDot $state={item.state} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </Legend>

          <MatrixAction>
            <BtnAnchor $variant="light" href="https://cbaldur.fusim.cn">
              前往 CBaldur 产品站
              <ButtonIcon />
            </BtnAnchor>
          </MatrixAction>
        </Shell>
      </MatrixBand>

      {/* ---------- 支撑层 ---------- */}
      <Band $tint>
        <Shell>
          <SectionHead>
            <Eyebrow>FOUNDATION</Eyebrow>
            <h2>矩阵的地基</h2>
            <p>矩阵不是几段孤立的模型：5 类自主求解器托住物理过程，国产异构算力托住求解器。</p>
          </SectionHead>

          <SolverStrip>
            {solvers.map((solver) => (
              <SolverCell key={solver.no}>
                <span>{solver.no}</span>
                <strong>{solver.label}</strong>
                <p>{solver.text}</p>
              </SolverCell>
            ))}
          </SolverStrip>

          <ComputeRow>
            <strong>{compute.value}</strong>
            <p>
              <b>{compute.label}</b> · {compute.text}
            </p>
          </ComputeRow>
        </Shell>
      </Band>

      {/* ---------- 装置与证据 ---------- */}
      <Band>
        <Shell>
          <SectionHead>
            <Eyebrow>EVIDENCE</Eyebrow>
            <h2>装置与证据</h2>
            <p>两个方向都已进入实际工程：托卡马克的全过程模拟，与场反位形的压缩过程模拟。</p>
          </SectionHead>

          <DeviceGrid>
            {[
              {
                page: tokamak,
                kicker: 'TOKAMAK · 托卡马克',
                points: '高能粒子（香蕉轨道 / 鱼骨模）、VDE 晕电流、MGI 破裂缓解',
              },
              {
                page: frc,
                kicker: 'FRC · 场反位形',
                points: '形成 / 平稳 / 磁压缩全过程模拟',
              },
            ].map(({ page, kicker, points }, index) => (
              <DeviceCard key={page.url} href={page.url} $delay={index}>
                <em>{kicker}</em>
                <strong>{page.frontmatter.title}</strong>
                <p>{points}</p>
                <i>查看方案 →</i>
              </DeviceCard>
            ))}
          </DeviceGrid>

          <EvidenceGrid>
            {evidence.map((item) => (
              <EvidenceItem key={item.org}>
                <strong>{item.org}</strong>
                <p>{item.claim}</p>
              </EvidenceItem>
            ))}
          </EvidenceGrid>
        </Shell>
      </Band>

      {/* ---------- 出口 ---------- */}
      <Band $tint>
        <Shell>
          <ExitBand>
            <h2>没列到的，可以按需评估</h2>
            <p>
              新的装置构型、还没列进矩阵的物理过程，我们按项目评估——先把要算的东西讲清楚，再谈能不能算、怎么算。
            </p>
            <ExitActions>
              <BtnLink href="/contact/" $variant="primary">
                预约合作
              </BtnLink>
              <BtnAnchor href="https://docs.fusim.cn/" $variant="light">
                访问产品文档
                <ButtonIcon />
              </BtnAnchor>
            </ExitActions>
          </ExitBand>
        </Shell>
      </Band>
    </>
  )
}
