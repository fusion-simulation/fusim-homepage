import { site } from '../content/site'
import { useLayoutStyles } from '../styles/layout'

export function Footer() {
  const c = useLayoutStyles()

  return (
    <footer className={c.footer} id="contact">
      <div>
        <h3>与聚核智算携手合作</h3>
        <p>
          业务合作 / 方案咨询 / 媒体联络：<a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
      <div className={c.footerMeta}>
        <span>FUSIM 聚核智算</span>
        <span>© 2025 FUSIM. All rights reserved.</span>
      </div>
      <div className={c.footerMeta}>
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
      </div>
    </footer>
  )
}
