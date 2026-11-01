import type { PublicationNode } from '../lib/publication-types'
import {
  TreeDirLink,
  TreeFileLink,
  TreeIcon,
  TreeItem,
  TreeList,
  TreeSize,
  TreeSubtree,
  TreeSummary,
} from '../styles/publications'
import { FileIcon, FolderIcon } from './Icons'

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
              <TreeIcon aria-hidden="true">
                <FileIcon />
              </TreeIcon>
              {node.name}
            </TreeFileLink>
            {node.sizeStr ? <TreeSize $variant={variant}>({node.sizeStr})</TreeSize> : null}
          </TreeItem>
        ) : (
          <TreeItem key={node.url}>
            <details>
              <TreeSummary>
                <TreeIcon aria-hidden="true">
                  <FolderIcon />
                </TreeIcon>
                <TreeDirLink href={node.url} target="_blank">
                  {node.name}
                </TreeDirLink>
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
