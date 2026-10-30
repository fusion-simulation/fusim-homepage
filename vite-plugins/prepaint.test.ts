import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function collectCssFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectCssFiles(full, found)
    else if (entry.name.endsWith('.css')) found.push(full)
  }
  return found
}

/**
 * 首屏不闪：全局配色 / 背景 / 重置必须在 index.html 的 <head> 里就生效，
 * 不能等 JS 打包执行后再由 createGlobalStyle 注入。
 */
test('index.html 的 head 里内联首屏全局样式（变量、暗色覆盖、body 背景、重置）', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8')
  const head = html.slice(0, html.indexOf('</head>'))
  const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(head)?.[1] ?? ''

  assert.ok(style.length > 0, 'head 里应有一段内联 <style>')
  assert.match(style, /:root\s*\{[\s\S]*--bg:/, '应定义 :root 的 --bg')
  assert.match(style, /--header-bg:/, '应定义半透明 header 背景变量')
  assert.match(style, /--font-sans:/, '应定义字体变量')
  assert.match(style, /html\[data-theme="dark"\]/, '应有暗色变量覆盖')
  assert.match(style, /box-sizing:\s*border-box/, '应有 * 重置')
  assert.match(style, /body\s*\{[\s\S]*radial-gradient/, 'body 背景（含渐变）应首屏生效')
})

test('仓库源码里没有 .css 文件', () => {
  const cssFiles = collectCssFiles(path.join(root, 'src'))
    .concat(collectCssFiles(path.join(root, 'vite-plugins')))
    .concat(collectCssFiles(path.join(root, 'scripts')))
    .map((file) => path.relative(root, file))

  assert.deepEqual(cssFiles, [])
})
