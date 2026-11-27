import { Link } from 'wouter'
import { site } from '../content/site'
import {
  FooterBar,
  FooterBottom,
  FooterBrandCol,
  FooterCol,
  FooterColTitle,
  FooterGrid,
  FooterLogo,
} from '../styles/layout'

/** 站点 2025 年上线。版权年份写成区间，跨年时不用再来改。 */
const SINCE = 2025
const currentYear = new Date().getFullYear()
const copyright = `© ${SINCE}${currentYear > SINCE ? `–${currentYear}` : ''} FUSIM. All rights reserved.`

const SiteLinks = [
  { href: '/products/', label: '产品矩阵' },
  // { href: '/publications/', label: '论文发表' },
  { href: '/press/', label: '企业动态' },
  { href: '/about/', label: '关于我们' },
  { href: '/responsibility/', label: '企业责任' },
]

const ProductLinks = [
  { href: 'https://cbaldur.fusim.cn', label: 'CBaldur 产品站' },
  { href: 'https://docs.fusim.cn/', label: '产品文档' },
  { href: '/contact/', label: '预约合作' },
]

export function Footer() {
  return (
    <FooterBar>
      <FooterGrid>
        <FooterBrandCol>
          <FooterLogo role="img" aria-label="聚核智算（武汉）科技有限公司" />
          <p>{site.description}</p>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </FooterBrandCol>

        <FooterCol aria-label="页面导航">
          <FooterColTitle>页面</FooterColTitle>
          {SiteLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </FooterCol>

        <FooterCol aria-label="产品导航">
          <FooterColTitle>产品</FooterColTitle>
          {ProductLinks.map((item) =>
            item.href.startsWith('http') ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ),
          )}
        </FooterCol>

        <FooterCol aria-label="合规信息">
          <FooterColTitle>合规</FooterColTitle>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
            {site.icp}
          </a>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502008408"
            rel="noopener noreferrer"
            target="_blank"
          >
            {site.mps}
          </a>
        </FooterCol>
      </FooterGrid>

      <FooterBottom>
        {/* 预渲染产物带的是构建时的年份，跨年时以浏览器为准，故抑制 hydration 差异告警。 */}
        <span suppressHydrationWarning>{copyright}</span>
        <span>{site.slogan}</span>
      </FooterBottom>
    </FooterBar>
  )
}
