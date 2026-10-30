import { site } from '../content/site'
import {
  FloatCard,
  FloatRow,
  FloatTag,
  FloatTitle,
  Hero,
  HeroActions,
  HeroDescription,
  HeroText,
  HeroTitle,
  HeroVisual,
  MockBody,
  MockDot,
  MockFrame,
  MockGradient,
  MockLine,
  MockMetric,
  MockMetricLabel,
  MockMetrics,
  MockMetricValue,
  MockScreen,
  MockTopbar,
  MockTopbarText,
} from '../styles/hero'
import { BtnAnchor, BtnLink, ButtonIcon } from '../styles/shared'

const metrics = [
  { value: '10+', label: '知识产权数量' },
  { value: '2+', label: '核心求解器' },
  { value: '2+', label: '核心算力枢纽' },
  { value: '99.99%', label: '平台稳定性' },
]

export function HomePage() {
  return (
    <Hero id="intro">
      <HeroText>
        <HeroTitle>{site.slogan2}</HeroTitle>

        <HeroDescription>{site.description}</HeroDescription>

        <HeroActions>
          <BtnLink href="/products/" $variant="primary">
            查看产品矩阵
          </BtnLink>
          <BtnLink href="/journal/" $variant="accent">
            阅读公司新闻
          </BtnLink>
          <BtnAnchor $variant="light" href="https://docs.fusim.cn/">
            访问产品文档
            <ButtonIcon />
          </BtnAnchor>
        </HeroActions>
      </HeroText>

      <HeroVisual $delay={1}>
        <FloatCard $side="left">
          <FloatTitle>FUSIM Console</FloatTitle>
          <FloatRow></FloatRow>
          <FloatRow></FloatRow>
          <FloatRow $short></FloatRow>
        </FloatCard>
        <FloatCard $side="right">
          <FloatTitle> 1</FloatTitle>
          <FloatTag>2 </FloatTag>
          <FloatTag>3 </FloatTag>
        </FloatCard>
        <MockFrame>
          <MockTopbar>
            <MockDot></MockDot>
            <MockDot></MockDot>
            <MockDot></MockDot>
            <MockTopbarText>FUSIM 智算总览</MockTopbarText>
          </MockTopbar>
          <MockBody>
            <MockMetrics>
              {metrics.map((metric) => (
                <MockMetric key={metric.label}>
                  <MockMetricValue>{metric.value}</MockMetricValue>
                  <MockMetricLabel>{metric.label}</MockMetricLabel>
                </MockMetric>
              ))}
            </MockMetrics>
            <MockScreen>
              <MockGradient></MockGradient>
              <MockLine></MockLine>
              <MockLine></MockLine>
              <MockLine $short></MockLine>
            </MockScreen>
          </MockBody>
        </MockFrame>
      </HeroVisual>
    </Hero>
  )
}
