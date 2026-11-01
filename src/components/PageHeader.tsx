import { PageDesc, PageEyebrow, PageHero, PageHeroInner, PageTitle } from '../styles/page'

type PageHeaderProps = {
  /** mono 眉题，如 ABOUT FUSIM。 */
  eyebrow: string
  title: string
  description?: string
}

/** 内页统一页头：眉题 + 标题 + 可选描述。 */
export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <PageHero>
      <PageHeroInner>
        <PageEyebrow>{eyebrow}</PageEyebrow>
        <PageTitle>{title}</PageTitle>
        {description ? <PageDesc>{description}</PageDesc> : null}
      </PageHeroInner>
    </PageHero>
  )
}
