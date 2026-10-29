import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

import type {
  AttachmentDir,
  PublicationItem,
  PublicationNode,
  PublicationsData,
} from '../src/lib/publication-types.ts'

export const VIRTUAL_PUBLICATIONS_ID = 'virtual:publications'
const RESOLVED_ID = '\0' + VIRTUAL_PUBLICATIONS_ID

/** 远程附件清单（相对项目根目录）：声明不在仓库中的大数据文件。 */
const MANIFEST_SEGMENTS = ['src', 'content', 'publications.manifest.json']

type ManifestEntry = {
  /** 相对 `public/assets/pub` 的路径，例如 `2026/1/data/xxx.dump`。 */
  path: string
  size?: number
}

type FileEntry = {
  /** 相对 `assets/pub/<year>/<item>/` 的路径。 */
  rel: string
  size?: number
}

type TreeFileNode = { type: 'file'; name: string; rel: string; size?: number }
type TreeDirNode = { type: 'dir'; name: string; rel: string; children: TreeNode[] }
type TreeNode = TreeFileNode | TreeDirNode

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

/** 读取并校验远程附件清单；文件不存在时返回空列表。 */
function readManifest(projectRoot: string): ManifestEntry[] {
  const manifestPath = path.join(projectRoot, ...MANIFEST_SEGMENTS)
  if (!fs.existsSync(manifestPath)) return []

  let parsed: { attachments?: unknown }
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { attachments?: unknown }
  } catch (error) {
    throw new Error(
      `无法解析 ${MANIFEST_SEGMENTS.join('/')}：${(error as Error).message}`,
    )
  }

  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : []

  return attachments.flatMap((raw): ManifestEntry[] => {
    if (!raw || typeof raw !== 'object') return []

    const { path: rawPath, size } = raw as { path?: unknown; size?: unknown }
    if (typeof rawPath !== 'string') return []

    const segments = rawPath.split('/').filter(Boolean)
    if (
      segments.length < 3 ||
      segments.some((segment) => segment === '.' || segment === '..')
    ) {
      throw new Error(
        `附件清单路径不合法：${rawPath}（应形如 2026/1/data/xxx，且不能包含 . 或 ..）`,
      )
    }

    return [
      {
        path: segments.join('/'),
        size:
          typeof size === 'number' && Number.isFinite(size) && size >= 0
            ? size
            : undefined,
      },
    ]
  })
}

/** 递归读取目录中的全部文件（跳过隐藏文件）。 */
function collectLocalFiles(dirAbs: string, relPrefix = ''): FileEntry[] {
  const files: FileEntry[] = []

  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue

    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name
    const abs = path.join(dirAbs, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectLocalFiles(abs, rel))
    } else if (entry.isFile()) {
      files.push({ rel, size: fs.statSync(abs).size })
    }
  }

  return files
}

/** 把「文件路径 + 大小」列表还原成目录树。 */
function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const segments = file.rel.split('/').filter(Boolean)
    if (segments.length === 0) continue

    let level = root
    let rel = ''

    for (let index = 0; index < segments.length; index++) {
      const name = segments[index]
      rel = rel ? `${rel}/${name}` : name
      const isFile = index === segments.length - 1

      if (isFile) {
        if (!level.some((node) => node.type === 'file' && node.name === name)) {
          level.push({ type: 'file', name, rel, size: file.size })
        }
        continue
      }

      let dir = level.find(
        (node): node is TreeDirNode => node.type === 'dir' && node.name === name,
      )
      if (!dir) {
        dir = { type: 'dir', name, rel, children: [] }
        level.push(dir)
      }
      level = dir.children
    }
  }

  sortTree(root)
  return root
}

function sortTree(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  for (const node of nodes) {
    if (node.type === 'dir') sortTree(node.children)
  }
}

/** 还原为页面使用的节点，并登记附件目录页。 */
function toPublicationNodes(
  nodes: TreeNode[],
  itemPrefix: string,
  parentUrl: string,
  dirPages: AttachmentDir[],
): PublicationNode[] {
  return nodes.map((node): PublicationNode => {
    if (node.type === 'file') {
      return {
        type: 'file',
        name: node.name,
        url: `/assets/pub/${itemPrefix}${node.rel}`,
        sizeStr: node.size === undefined ? '' : formatBytes(node.size),
      }
    }

    const nodeUrl = `/assets/pub/${itemPrefix}${node.rel}/`
    const children = toPublicationNodes(node.children, itemPrefix, nodeUrl, dirPages)

    // 顶级子目录的上一级是论文列表页，嵌套目录的上一级是父目录
    dirPages.push({ url: nodeUrl, name: node.name, parentUrl, children })

    return { type: 'dir', name: node.name, url: nodeUrl, children }
  })
}

/**
 * 扫描 `assets/pub/<year>/<item>/`：
 * - 每个含 PDF 的目录作为一条论文记录（取目录中的第一个 PDF）
 * - 其余本地文件 / 子目录 + 附件清单中的远程文件，统一作为「附加文件」树
 * - 每个子目录生成独立附件目录页
 */
function collectPublications(root: string, projectRoot: string): PublicationsData {
  const items: Array<PublicationItem & { year: string }> = []
  const attachmentDirs: AttachmentDir[] = []

  if (!fs.existsSync(root)) return { publications: [], attachmentDirs }

  const manifestByItem = new Map<string, FileEntry[]>()
  for (const entry of readManifest(projectRoot)) {
    const [year, item, ...rest] = entry.path.split('/')
    const key = `${year}/${item}`
    const list = manifestByItem.get(key) ?? []
    list.push({ rel: rest.join('/'), size: entry.size })
    manifestByItem.set(key, list)
  }

  const matchedItems = new Set<string>()

  for (const yearEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!yearEntry.isDirectory() || yearEntry.name.startsWith('.')) continue

    const year = yearEntry.name
    const yearDir = path.join(root, year)

    for (const itemEntry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!itemEntry.isDirectory() || itemEntry.name.startsWith('.')) continue

      const itemName = itemEntry.name
      const itemDir = path.join(yearDir, itemName)
      const itemKey = `${year}/${itemName}`
      const localFiles = collectLocalFiles(itemDir)

      const pdfEntry = localFiles.find(
        (file) => !file.rel.includes('/') && file.rel.toLowerCase().endsWith('.pdf'),
      )
      if (!pdfEntry) continue

      const pdfPath = path.join(itemDir, pdfEntry.rel)
      const stat = fs.statSync(pdfPath)
      const mtime = stat.mtime ? stat.mtime.toISOString().slice(0, 10) : ''

      // 本地附件优先，清单补足远程文件
      const attachments = new Map<string, FileEntry>()
      for (const file of localFiles) {
        if (file.rel !== pdfEntry.rel) attachments.set(file.rel, file)
      }
      for (const file of manifestByItem.get(itemKey) ?? []) {
        if (file.rel && file.rel !== pdfEntry.rel && !attachments.has(file.rel)) {
          attachments.set(file.rel, file)
        }
      }
      matchedItems.add(itemKey)

      const itemPrefix = `${year}/${itemName}/`
      const data = toPublicationNodes(
        buildTree([...attachments.values()]),
        itemPrefix,
        '/publications/',
        attachmentDirs,
      )

      const metaParts: string[] = [`归档：${year}/${itemName}`]
      if (mtime) metaParts.push(`更新：${mtime}`)
      metaParts.push(`PDF · ${formatBytes(stat.size)}`)

      items.push({
        year,
        title: pdfEntry.rel.replace(/\.pdf$/i, ''),
        url: `/assets/pub/${itemPrefix}${pdfEntry.rel}`,
        meta: metaParts.join(' · '),
        data,
      })
    }
  }

  for (const key of manifestByItem.keys()) {
    if (!matchedItems.has(key)) {
      console.warn(
        `[publications] 附件清单中的 ${key} 没有对应的论文目录（assets/pub/${key}/），已忽略。`,
      )
    }
  }

  const groups = new Map<string, PublicationItem[]>()

  for (const item of items) {
    const { year, ...publicItem } = item
    const list = groups.get(year) ?? []
    list.push(publicItem)
    groups.set(year, list)
  }

  const sortedYears = [...groups.keys()].sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    const aNum = Number.isFinite(na)
    const bNum = Number.isFinite(nb)

    if (aNum && bNum) return nb - na
    if (aNum) return -1
    if (bNum) return 1
    return b.localeCompare(a, 'zh-CN')
  })

  return {
    publications: sortedYears.map((year) => ({
      year,
      items: (groups.get(year) ?? []).sort((a, b) => a.url.localeCompare(b.url, 'en')),
    })),
    attachmentDirs,
  }
}

/**
 * 把 `public/assets/pub` 的目录结构 + 远程附件清单编译为虚拟模块 `virtual:publications`。
 */
export function publications(): Plugin {
  let publicDir = ''
  let projectRoot = ''

  const invalidate = (server: ViteDevServer) => {
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
    if (!mod) return

    server.moduleGraph.invalidateModule(mod)
    server.ws.send({ type: 'full-reload' })
  }

  const isRelevant = (file: string) => {
    if (!projectRoot) return false
    if (file === path.join(projectRoot, ...MANIFEST_SEGMENTS)) return true
    if (!publicDir) return false

    return file.startsWith(path.join(publicDir, 'assets', 'pub'))
  }

  return {
    name: 'fusim:publications',
    configResolved(config) {
      publicDir = config.publicDir
      projectRoot = config.root
    },
    configureServer(server) {
      server.watcher.on('all', (_event, file) => {
        if (isRelevant(file)) invalidate(server)
      })
    },
    resolveId(id) {
      return id === VIRTUAL_PUBLICATIONS_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null

      const data = collectPublications(
        path.join(publicDir, 'assets', 'pub'),
        projectRoot,
      )

      return [
        `export const publications = ${JSON.stringify(data.publications)};`,
        `export const attachmentDirs = ${JSON.stringify(data.attachmentDirs)};`,
      ].join('\n')
    },
  }
}
