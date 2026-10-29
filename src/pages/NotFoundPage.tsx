import { mergeClasses } from '@griffel/react'
import { Link } from 'wouter'
import { useSharedStyles } from '../styles/shared'

export function NotFoundPage() {
  const s = useSharedStyles()

  return (
    <section className={s.section} id="not-found">
      <div className={s.reveal}>
        <h2>页面不存在</h2>
        <p>你访问的页面可能已被移动或删除。</p>
        <p style={{ marginTop: 24 }}>
          <Link href="/" className={mergeClasses(s.button, s.buttonSecondary)}>
            返回首页
          </Link>
        </p>
      </div>
    </section>
  )
}
