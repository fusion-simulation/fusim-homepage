import { Route, Switch, useLocation } from 'wouter'
import { Layout } from './components/Layout'
import { contentPageByUrl } from './lib/content'
import { normalizePath } from './lib/meta'
import { useDocumentMeta } from './lib/useDocumentMeta'
import { useScrollToTop } from './lib/useScrollToTop'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { MdxPage } from './pages/MdxPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PressPage } from './pages/PressPage'
import { ProductsPage } from './pages/ProductsPage'
import { PublicationsPage } from './pages/PublicationsPage'
import { ResponsibilityPage } from './pages/ResponsibilityPage'

/** 所有 MDX 内容页（产品、论文、企业动态…）共用同一个路由。 */
function ContentRoute() {
  const [location] = useLocation()
  const page = contentPageByUrl.get(normalizePath(location))

  return page ? <MdxPage page={page} /> : <NotFoundPage />
}

export function App() {
  const [location] = useLocation()
  const url = normalizePath(location)

  useDocumentMeta(url)
  useScrollToTop(url)

  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/press" component={PressPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/publications" component={PublicationsPage} />
        <Route path="/responsibility" component={ResponsibilityPage} />
        <Route component={ContentRoute} />
      </Switch>
    </Layout>
  )
}
