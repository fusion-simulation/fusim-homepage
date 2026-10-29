import { mergeClasses } from '@griffel/react'
import { Link } from 'wouter'
import type { ContentPage } from '../lib/content'
import { productSections, productsOfSection } from '../lib/content'
import { useSharedStyles } from '../styles/shared'

function ProductCard({ product }: { product: ContentPage }) {
  const s = useSharedStyles()
  const { frontmatter } = product
  const externalUrl = frontmatter.external_url
  const className = mergeClasses(s.card, s.reveal, s.delay1)
  const description = frontmatter.desp ?? frontmatter.description

  const content = (
    <>
      <h4>{frontmatter.title}</h4>
      {description ? <p>{description}</p> : null}
    </>
  )

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={product.url} className={className}>
      {content}
    </Link>
  )
}

export function ProductsPage() {
  const s = useSharedStyles()

  return (
    <>
      {productSections.map((section) => {
        const { frontmatter } = section
        const SectionContent = section.Component
        const sectionProducts = productsOfSection(frontmatter.section_key)

        return (
          <section
            className={s.section}
            id={`products-${frontmatter.section_key}`}
            key={section.url}
          >
            <div className={s.reveal}>
              <h2>{frontmatter.title}</h2>
              <SectionContent />
            </div>

            <div className={s.cardGrid}>
              {sectionProducts.map((product) => (
                <ProductCard key={product.url} product={product} />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
