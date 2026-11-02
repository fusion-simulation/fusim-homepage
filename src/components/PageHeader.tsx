import {
  PageDesc,
  PageEyebrow,
  PageHero,
  PageHeroInner,
  PageHeroReadingInner,
  PageTitle,
} from '../styles/page'

type PageHeaderProps = {
  /** mono 眉题，如 ABOUT FUSIM。 */
  eyebrow: string
  title: string
  description?: string
  /** `wide`：站点内页宽度（默认）；`reading`：与内容页正文列同宽。 */
  width?: 'wide' | 'reading'
}

/** 内页统一页头：眉题 + 标题 + 可选描述。 */
export function PageHeader({ eyebrow, title, description, width = 'wide' }: PageHeaderProps) {
  const Inner = width === 'reading' ? PageHeroReadingInner : PageHeroInner

  return (
    <PageHero>
      <Inner>
        <PageEyebrow>{eyebrow}</PageEyebrow>
        <PageTitle>{title}</PageTitle>
        {description ? <PageDesc>{description}</PageDesc> : null}
      </Inner>
    </PageHero>
  )
}
