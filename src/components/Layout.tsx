import type { ReactNode } from 'react'
import { useLayoutStyles } from '../styles/layout'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout({ children }: { children: ReactNode }) {
  const c = useLayoutStyles()

  return (
    <div className={c.page}>
      <Header />
      <main className={c.content}>{children}</main>
      <Footer />
    </div>
  )
}
