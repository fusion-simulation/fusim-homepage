import type { ReactNode } from 'react'
import { PageDesc, PageHero, PageHeroInner, PageHeroReadingInner, PageTitle } from '../styles/page'

type PageHeaderProps = {
  title: string
  description?: string
  /** 简介之后的附加行，如日期、来源链接。 */
  footer?: ReactNode
  /** `wide`：站点内页宽度（默认）；`reading`：与内容页正文列同宽。 */
  width?: 'wide' | 'reading'
}

/** 内页统一页头：标题 + 可选描述。 */
export function PageHeader({ title, description, footer, width = 'wide' }: PageHeaderProps) {
  const Inner = width === 'reading' ? PageHeroReadingInner : PageHeroInner

  return (
    <PageHero>
      <Inner>
        <PageTitle>{title}</PageTitle>
        {description ? <PageDesc>{description}</PageDesc> : null}
        {footer ? <PageDesc>{footer}</PageDesc> : null}
      </Inner>
    </PageHero>
  )
}
