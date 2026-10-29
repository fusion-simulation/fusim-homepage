import { mergeClasses } from '@griffel/react'
import { Link } from 'wouter'
import { site } from '../content/site'
import { useSharedStyles } from '../styles/shared'
import { useHeroStyles } from '../styles/hero'
import { ExternalLinkIcon } from '../components/Icons'

const metrics = [
  { value: '10+', label: '知识产权数量' },
  { value: '2+', label: '核心求解器' },
  { value: '2+', label: '核心算力枢纽' },
  { value: '99.99%', label: '平台稳定性' },
]

export function HomePage() {
  const c = useHeroStyles()
  const s = useSharedStyles()

  return (
    <section className={c.hero} id="intro">
      <div className={mergeClasses(c.heroText, s.reveal)}>
        <h1 className={c.heroTitle}>{site.slogan2}</h1>

        <p className={c.heroDescription}>{site.description}</p>

        <div className={c.heroActions}>
          <Link href="/products/" className={mergeClasses(s.button, s.buttonPrimary)}>
            查看产品矩阵
          </Link>
          <Link href="/journal/" className={mergeClasses(s.button, s.buttonAccent)}>
            阅读公司新闻
          </Link>
          <a
            className={mergeClasses(s.button, s.buttonLight)}
            href="https://docs.fusim.cn/"
          >
            访问产品文档
            <ExternalLinkIcon className={s.buttonIcon} />
          </a>
        </div>
      </div>

      <aside className={mergeClasses(c.heroVisual, s.reveal, s.delay1)}>
        <div className={mergeClasses(c.floatCard, c.floatCardLeft)}>
          <p className={c.floatTitle}>FUSIM Console</p>
          <div className={c.floatRow}></div>
          <div className={c.floatRow}></div>
          <div className={mergeClasses(c.floatRow, c.floatRowShort)}></div>
        </div>
        <div className={mergeClasses(c.floatCard, c.floatCardRight)}>
          <p className={c.floatTitle}> 1</p>
          <div className={c.floatTag}>2 </div>
          <div className={c.floatTag}>3 </div>
        </div>
        <div className={c.mockFrame}>
          <div className={c.mockTopbar}>
            <span className={c.mockDot}></span>
            <span className={c.mockDot}></span>
            <span className={c.mockDot}></span>
            <p className={c.mockTopbarText}>FUSIM 智算总览</p>
          </div>
          <div className={c.mockBody}>
            <div className={c.mockMetrics}>
              {metrics.map((metric) => (
                <div className={c.mockMetric} key={metric.label}>
                  <strong className={c.mockMetricValue}>{metric.value}</strong>
                  <p className={c.mockMetricLabel}>{metric.label}</p>
                </div>
              ))}
            </div>
            <div className={c.mockScreen}>
              <div className={c.mockGradient}></div>
              <div className={c.mockLine}></div>
              <div className={c.mockLine}></div>
              <div className={mergeClasses(c.mockLine, c.mockLineShort)}></div>
            </div>
          </div>
        </div>
      </aside>
    </section>
  )
}
