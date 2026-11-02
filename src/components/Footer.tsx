import { site } from '../content/site'
import {
  FooterBar,
  FooterBottom,
  FooterBrandCol,
  FooterCol,
  FooterGrid,
  FooterLogo,
} from '../styles/layout'

const SiteLinks = [
  { href: '/products/', label: '产品矩阵' },
  { href: '/publications/', label: '论文发表' },
  { href: '/journal/', label: '公司新闻' },
  { href: '/press/', label: '社会报导' },
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
          <h4>页面</h4>
          {SiteLinks.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </FooterCol>

        <FooterCol aria-label="产品导航">
          <h4>产品</h4>
          {ProductLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              {...(item.href.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {item.label}
            </a>
          ))}
        </FooterCol>

        <FooterCol aria-label="合规信息">
          <h4>合规</h4>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
            {site.icp}
          </a>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502008408"
            rel="noreferrer"
            target="_blank"
          >
            {site.mps}
          </a>
        </FooterCol>
      </FooterGrid>

      <FooterBottom>
        <span>© 2025 FUSIM. All rights reserved.</span>
        <span>{site.slogan}</span>
      </FooterBottom>
    </FooterBar>
  )
}
