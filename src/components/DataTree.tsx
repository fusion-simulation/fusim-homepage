import { mergeClasses } from '@griffel/react'
import type { PublicationNode } from '../lib/publication-types'
import { useDataTreeStyles } from '../styles/publications'

type DataTreeProps = {
  nodes: PublicationNode[]
  /** 附件目录页使用固定的浅色配色。 */
  variant?: 'site' | 'attachment'
}

export function DataTree({ nodes, variant = 'site' }: DataTreeProps) {
  const c = useDataTreeStyles()

  if (nodes.length === 0) return null

  return (
    <ul className={c.list}>
      {nodes.map((node) =>
        node.type === 'file' ? (
          <li key={node.url} className={c.item}>
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={variant === 'attachment' ? c.fileLinkOnAttachmentPage : undefined}
            >
              📄 {node.name}
            </a>
            {node.sizeStr ? (
              <span
                className={mergeClasses(
                  c.size,
                  variant === 'attachment' && c.sizeOnAttachmentPage,
                )}
              >
                ({node.sizeStr})
              </span>
            ) : null}
          </li>
        ) : (
          <li key={node.url} className={c.item}>
            <details>
              <summary className={c.summary}>
                📁{' '}
                <a href={node.url} target="_blank" className={c.dirLink}>
                  {node.name}
                </a>
              </summary>
              <div className={c.subtree}>
                <DataTree nodes={node.children} variant={variant} />
              </div>
            </details>
          </li>
        ),
      )}
    </ul>
  )
}
