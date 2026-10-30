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
