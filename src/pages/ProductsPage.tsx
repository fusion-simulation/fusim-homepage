import { PageHeader } from '../components/PageHeader'
import type { ContentPage } from '../lib/content'
import { productSections, productsOfSection } from '../lib/content'
import { CardAnchor, CardGrid, CardLink, Reveal, Section } from '../styles/shared'

function ProductCard({ product }: { product: ContentPage }) {
  const { frontmatter } = product
  const externalUrl = frontmatter.external_url
  const description = frontmatter.desp ?? frontmatter.description

  const content = (
    <>
      <h4>{frontmatter.title}</h4>
      {description ? <p>{description}</p> : null}
    </>
  )

  if (externalUrl) {
    return (
      <CardAnchor href={externalUrl} $delay={1} target="_blank" rel="noopener noreferrer">
        {content}
      </CardAnchor>
    )
  }

  return (
    <CardLink href={product.url} $delay={1}>
      {content}
    </CardLink>
  )
}

export function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="产品矩阵"
        description="覆盖聚变物理与工程仿真的核心工具链，以及面向装置的定制化仿真方案。"
      />

      {productSections.map((section) => {
        const { frontmatter } = section
        const SectionContent = section.Component
        const sectionProducts = productsOfSection(frontmatter.section_key)

        return (
          <Section id={`products-${frontmatter.section_key}`} key={section.url}>
            <Reveal>
              <h2>{frontmatter.title}</h2>
              <SectionContent />
            </Reveal>

            <CardGrid>
              {sectionProducts.map((product) => (
                <ProductCard key={product.url} product={product} />
              ))}
            </CardGrid>
          </Section>
        )
      })}
    </>
  )
}
