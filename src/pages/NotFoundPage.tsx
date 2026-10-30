import { BtnLink, ButtonRow, Reveal, Section } from '../styles/shared'

export function NotFoundPage() {
  return (
    <Section id="not-found">
      <Reveal>
        <h2>页面不存在</h2>
        <p>你访问的页面可能已被移动或删除。</p>
        <ButtonRow>
          <BtnLink href="/" $variant="secondary">
            返回首页
          </BtnLink>
        </ButtonRow>
      </Reveal>
    </Section>
  )
}
