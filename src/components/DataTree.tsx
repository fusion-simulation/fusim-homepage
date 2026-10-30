import type { PublicationNode } from '../lib/publication-types'
import {
  TreeDirLink,
  TreeFileLink,
  TreeItem,
  TreeList,
  TreeSize,
  TreeSubtree,
  TreeSummary,
} from '../styles/publications'

type DataTreeProps = {
  nodes: PublicationNode[]
  /** 附件目录页使用固定的浅色配色。 */
  variant?: 'site' | 'attachment'
}

export function DataTree({ nodes, variant = 'site' }: DataTreeProps) {
  if (nodes.length === 0) return null

  return (
    <TreeList>
      {nodes.map((node) =>
        node.type === 'file' ? (
          <TreeItem key={node.url}>
            <TreeFileLink
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              $onAttachmentPage={variant === 'attachment'}
            >
              📄 {node.name}
            </TreeFileLink>
            {node.sizeStr ? <TreeSize $variant={variant}>({node.sizeStr})</TreeSize> : null}
          </TreeItem>
        ) : (
          <TreeItem key={node.url}>
            <details>
              <TreeSummary>
                📁 <TreeDirLink href={node.url} target="_blank">{node.name}</TreeDirLink>
              </TreeSummary>
              <TreeSubtree>
                <DataTree nodes={node.children} variant={variant} />
              </TreeSubtree>
            </details>
          </TreeItem>
        ),
      )}
    </TreeList>
  )
}
