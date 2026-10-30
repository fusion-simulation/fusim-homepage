import type { ReactNode } from 'react'
import { Content, Page } from '../styles/layout'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <Page>
      <Header />
      <Content>{children}</Content>
      <Footer />
    </Page>
  )
}
