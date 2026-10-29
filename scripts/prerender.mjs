#!/usr/bin/env node
/**
 * 预渲染脚本：
 * 1. 复用 `vite build` 产出的 dist/index.html 作为模板（含 Vite 注入的 js/css 资源标签）；
 * 2. 用 SSR bundle 渲染每个路由的 HTML，写入 `dist/<route>/index.html`；
 * 3. 额外生成 404.html。
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const ssrEntry = path.join(ssrDir, 'entry-server.js')

const { getStaticPaths, render } = await import(pathToFileURL(ssrEntry).href)

const template = await readFile(path.join(distDir, 'index.html'), 'utf8')

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function buildDocument({ html, meta }) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    )
    .replace(/(<div id="root">)\s*(<\/div>)/, `$1${html}$2`)
}

async function writePage(url, result, filePath) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, buildDocument(result), 'utf8')
  console.log(`  ✓ ${url} → ${path.relative(root, filePath)}`)
}

const pages = getStaticPaths()

for (const page of pages) {
  const target =
    page.url === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, page.url, 'index.html')

  await writePage(page.url, render(page.url), target)
}

await writePage('/404.html', render('/404.html'), path.join(distDir, '404.html'))

await rm(ssrDir, { recursive: true, force: true })

console.log(`\n预渲染完成：${pages.length + 1} 个 HTML 页面。`)
