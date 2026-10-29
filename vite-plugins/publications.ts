import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

import type {
  AttachmentDir,
  PublicationFileNode,
  PublicationItem,
  PublicationNode,
  PublicationsData,
} from '../src/lib/publication-types.ts'

export const VIRTUAL_PUBLICATIONS_ID = 'virtual:publications'
const RESOLVED_ID = '\0' + VIRTUAL_PUBLICATIONS_ID

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

function compareNodes(a: PublicationNode, b: PublicationNode): number {
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
  return a.name.localeCompare(b.name)
}

function createFileNode(absPath: string, name: string, url: string): PublicationFileNode {
  return {
    type: 'file',
    name,
    url,
    sizeStr: formatBytes(fs.statSync(absPath).size),
  }
}

/**
 * 递归扫描附件目录，返回可供页面展示的文件树；同时登记子目录页面。
 */
function scanTree(
  dirAbs: string,
  urlPrefix: string,
  parentUrl: string,
  dirPages: AttachmentDir[],
): PublicationNode[] {
  const nodes: PublicationNode[] = []

  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue

    if (entry.isFile()) {
      nodes.push(createFileNode(path.join(dirAbs, entry.name), entry.name, `/${urlPrefix}${entry.name}`))
      continue
    }

    if (entry.isDirectory()) {
      const nodeUrl = `/${urlPrefix}${entry.name}/`
      const children = scanTree(path.join(dirAbs, entry.name), `${urlPrefix}${entry.name}/`, nodeUrl, dirPages)

      nodes.push({ type: 'dir', name: entry.name, url: nodeUrl, children })
      dirPages.push({ url: nodeUrl, name: entry.name, parentUrl, children })
    }
  }

  return nodes.sort(compareNodes)
}

/**
 * 扫描 `assets/pub/<year>/<item>/`：
 * - 每个含 PDF 的目录作为一条论文记录，PDF 同级的其他文件 / 子目录作为附件
 * - 子目录同时生成独立的附件目录页面
 */
function collectPublications(root: string): PublicationsData {
  const items: Array<PublicationItem & { year: string }> = []
  const attachmentDirs: AttachmentDir[] = []

  if (!fs.existsSync(root)) return { publications: [], attachmentDirs }

  const years = fs.readdirSync(root, { withFileTypes: true })

  for (const yearEntry of years) {
    if (!yearEntry.isDirectory() || yearEntry.name.startsWith('.')) continue

    const year = yearEntry.name
    const yearDir = path.join(root, year)

    for (const itemEntry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!itemEntry.isDirectory() || itemEntry.name.startsWith('.')) continue

      const itemName = itemEntry.name
      const itemDir = path.join(yearDir, itemName)
      const entries = fs
        .readdirSync(itemDir, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith('.'))

      const pdfEntry = entries.find(
        (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'),
      )
      if (!pdfEntry) continue

      const urlPrefix = `assets/pub/${year}/${itemName}/`
      const dataNodes: PublicationNode[] = []

      for (const entry of entries) {
        if (entry.name === pdfEntry.name) continue

        if (entry.isDirectory()) {
          const nodeUrl = `/${urlPrefix}${entry.name}/`
          const children = scanTree(
            path.join(itemDir, entry.name),
            `${urlPrefix}${entry.name}/`,
            nodeUrl,
            attachmentDirs,
          )

          dataNodes.push({ type: 'dir', name: entry.name, url: nodeUrl, children })
          attachmentDirs.push({ url: nodeUrl, name: entry.name, parentUrl: '/publications/', children })
        } else if (entry.isFile()) {
          dataNodes.push(
            createFileNode(path.join(itemDir, entry.name), entry.name, `/${urlPrefix}${entry.name}`),
          )
        }
      }

      const pdfPath = path.join(itemDir, pdfEntry.name)
      const stat = fs.statSync(pdfPath)
      const mtime = stat.mtime ? stat.mtime.toISOString().slice(0, 10) : ''

      const metaParts: string[] = [`归档：${year}/${itemName}`]
      if (mtime) metaParts.push(`更新：${mtime}`)
      metaParts.push(`PDF · ${formatBytes(stat.size)}`)

      items.push({
        year,
        title: pdfEntry.name.replace(/\.pdf$/i, ''),
        url: `/${urlPrefix}${pdfEntry.name}`,
        meta: metaParts.join(' · '),
        data: dataNodes.sort(compareNodes),
      })
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
 * 把 `public/assets/pub` 的目录结构编译为虚拟模块 `virtual:publications`。
 */
export function publications(): Plugin {
  let publicDir = ''

  const invalidate = (server: ViteDevServer, file: string) => {
    if (!publicDir || !file.startsWith(path.join(publicDir, 'assets', 'pub'))) return

    const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
    if (mod) {
      server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
    }
  }

  return {
    name: 'fusim:publications',
    configResolved(config) {
      publicDir = config.publicDir
    },
    configureServer(server) {
      server.watcher.on('all', (_event, file) => invalidate(server, file))
    },
    resolveId(id) {
      return id === VIRTUAL_PUBLICATIONS_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null

      const data = collectPublications(path.join(publicDir, 'assets', 'pub'))

      return [
        `export const publications = ${JSON.stringify(data.publications)};`,
        `export const attachmentDirs = ${JSON.stringify(data.attachmentDirs)};`,
      ].join('\n')
    },
  }
}
