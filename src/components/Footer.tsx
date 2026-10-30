import { site } from '../content/site'
import { FooterBar, FooterMeta } from '../styles/layout'

export function Footer() {
  return (
    <FooterBar id="contact">
      <div>
        <h3>与聚核智算携手合作</h3>
        <p>
          业务合作 / 方案咨询 / 媒体联络：<a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
      <FooterMeta>
        <span>FUSIM 聚核智算</span>
        <span>© 2025 FUSIM. All rights reserved.</span>
      </FooterMeta>
      <FooterMeta>
        <span>
          备案号：
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
            {site.icp}
          </a>
        </span>
        <span>
          公安备案号：
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=42018502008408"
            rel="noreferrer"
            target="_blank"
          >
            {site.mps}
          </a>
        </span>
      </FooterMeta>
    </FooterBar>
  )
}
