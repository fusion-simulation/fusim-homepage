import { ExternalLinkIcon, FileIcon } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { publications } from '../lib/publications'
import {
  EmptyPanel,
  PubAction,
  PubCard,
  PubHead,
  PubIndex,
  PubList,
  PubMeta,
  PubTag,
  PubTitle,
  StatCell,
  StatStrip,
  YearBlock,
  YearCount,
  YearNumber,
  YearRail,
} from '../styles/hub'
import { Section } from '../styles/shared'

export function PublicationsPage() {
  const total = publications.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <>
      <PageHeader title="论文发表" description="集中展示聚核智算的论文与技术报告（PDF）。" />

      <Section id="publications">
        {publications.length > 0 ? (
          <>
            <StatStrip>
              <StatCell>
                <dt>Total</dt>
                <dd>
                  {total}
                  <span>篇</span>
                </dd>
              </StatCell>
              <StatCell>
                <dt>Years</dt>
                <dd>
                  {publications.length}
                  <span>年</span>
                </dd>
              </StatCell>
              <StatCell>
                <dt>Latest</dt>
                <dd>{publications[0].year}</dd>
              </StatCell>
            </StatStrip>

            {publications.map((group) => (
              <YearBlock key={group.year}>
                <YearRail>
                  <YearNumber>{group.year}</YearNumber>
                  <YearCount>{String(group.items.length).padStart(2, '0')} 篇</YearCount>
                </YearRail>

                <PubList>
                  {group.items.map((item, index) => (
                    <PubCard key={item.url} $delay={index % 3}>
                      <PubHead>
                        <PubIndex>No. {String(index + 1).padStart(2, '0')}</PubIndex>
                        <PubTag>PDF</PubTag>
                      </PubHead>
                      <PubTitle>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.title}
                        </a>
                      </PubTitle>
                      <PubMeta>{item.meta}</PubMeta>
                      <PubAction href={item.url} target="_blank" rel="noopener noreferrer">
                        <FileIcon />
                        查看 PDF
                        <ExternalLinkIcon />
                      </PubAction>
                    </PubCard>
                  ))}
                </PubList>
              </YearBlock>
            ))}
          </>
        ) : (
          <EmptyPanel $delay={1}>
            <h2>暂无论文</h2>
            <div>
              请将 PDF 放入 <code>assets/pub</code>（支持按年份/子目录归档）。
            </div>
          </EmptyPanel>
        )}
      </Section>
    </>
  )
}
