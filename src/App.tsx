import { Route, Switch, useLocation } from 'wouter'
import { Layout } from './components/Layout'
import { contentPageByUrl } from './lib/content'
import { normalizePath } from './lib/meta'
import { attachmentDirByUrl } from './lib/publications'
import { useDocumentMeta } from './lib/useDocumentMeta'
import { useScrollToTop } from './lib/useScrollToTop'
import { AboutPage } from './pages/AboutPage'
import { AttachmentDirPage } from './pages/AttachmentDirPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { JournalPage } from './pages/JournalPage'
import { MdxPage } from './pages/MdxPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PressPage } from './pages/PressPage'
import { ProductsPage } from './pages/ProductsPage'
import { PublicationsPage } from './pages/PublicationsPage'
import { ResponsibilityPage } from './pages/ResponsibilityPage'

/** 所有 MDX 内容页（产品、论文、日志文章…）共用同一个路由。 */
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

  // 论文附件目录页是独立页面（不带站点 header / footer）
  const attachmentDir = attachmentDirByUrl.get(url)
  if (attachmentDir) {
    return <AttachmentDirPage dir={attachmentDir} />
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/press" component={PressPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/publications" component={PublicationsPage} />
        <Route path="/responsibility" component={ResponsibilityPage} />
        <Route component={ContentRoute} />
      </Switch>
    </Layout>
  )
}
