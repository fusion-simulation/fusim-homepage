import fs from 'node:fs'
import path from 'node:path'
import type { LoaderContext } from 'webpack'

import type { PublicationGroup, PublicationItem } from '../src/lib/publication-types.ts'

/** 论文根目录（相对 publicDir）。 */
export const PUB_SEGMENTS = ['assets', 'pub']

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

/** 扫描 `assets/pub/<year>/<item>/`：每个含 PDF 的目录作为一条论文记录（取目录中的第一个 PDF）。 */
function collectPublications(root: string): PublicationGroup[] {
  const items: Array<PublicationItem & { year: string }> = []

  if (!fs.existsSync(root)) return []

  for (const yearEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!yearEntry.isDirectory() || yearEntry.name.startsWith('.')) continue

    const year = yearEntry.name
    const yearDir = path.join(root, year)

    for (const itemEntry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!itemEntry.isDirectory() || itemEntry.name.startsWith('.')) continue

      const itemName = itemEntry.name
      const itemDir = path.join(yearDir, itemName)

      const pdfName = fs
        .readdirSync(itemDir)
        .find((name) => !name.startsWith('.') && name.toLowerCase().endsWith('.pdf'))
      if (!pdfName) continue

      const pdfPath = path.join(itemDir, pdfName)
      const stat = fs.statSync(pdfPath)
      const mtime = stat.mtime ? stat.mtime.toISOString().slice(0, 10) : ''

      const metaParts: string[] = [`归档：${year}/${itemName}`]
      if (mtime) metaParts.push(`更新：${mtime}`)
      metaParts.push(`PDF · ${formatBytes(stat.size)}`)

      items.push({
        year,
        title: pdfName.replace(/\.pdf$/i, ''),
        url: `/assets/pub/${year}/${itemName}/${pdfName}`,
        meta: metaParts.join(' · '),
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

  return sortedYears.map((year) => ({
    year,
    items: (groups.get(year) ?? []).sort((a, b) => a.url.localeCompare(b.url, 'en')),
  }))
}

/**
 * 把 `public/assets/pub` 的目录结构编译为虚拟模块 `virtual:publications`。
 *
 * 用一个 loader 接管 `webpack-plugins/virtual-publications.js`（config 里通过 alias 把
 * `virtual:publications` 指到它）：`addContextDependency` 让 webpack 的 watcher 盯住
 * 论文目录，新增 / 删除 PDF 都会触发重新生成。
 */
export default function publicationsLoader(this: LoaderContext<Record<string, never>>): string {
  const root = this.rootContext
  const pubDir = path.join(root, 'public', ...PUB_SEGMENTS)

  // 目录不存在时不必登记依赖：watchpack 会为不存在的路径报错
  if (fs.existsSync(pubDir)) this.addContextDependency(pubDir)

  return `export const publications = ${JSON.stringify(collectPublications(pubDir))};`
}
