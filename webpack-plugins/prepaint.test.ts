import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

const root = process.cwd()

function collectCssFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectCssFiles(full, found)
    else if (entry.name.endsWith('.css')) found.push(full)
  }
  return found
}

/** 取一段静态 CSS 令牌块的声明体（令牌块内没有嵌套花括号）。 */
function tokenBlock(style: string, selector: string): string {
  const start = style.indexOf(`${selector} {`)
  assert.ok(start >= 0, `应存在 ${selector} 的令牌块`)
  const open = style.indexOf('{', start)
  const close = style.indexOf('}', open)
  return style.slice(open + 1, close)
}

function assertTokens(block: string, tokens: Record<string, string>, label: string) {
  for (const [name, value] of Object.entries(tokens)) {
    assert.match(block, new RegExp(`${name}:\\s*${value};`), `${label}应把 ${name} 设为 ${value}`)
  }
}

/**
 * 首屏不闪：全局配色 / 背景 / 重置必须在 index.html 的 <head> 里就生效，
 * 不能等 JS 打包执行后再由 createGlobalStyle 注入。
 */
test('index.html 的 head 里内联中性黑白令牌（亮色默认、暗色覆盖、body 背景、重置）', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8')
  const head = html.slice(0, html.indexOf('</head>'))
  const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(head)?.[1] ?? ''

  assert.ok(style.length > 0, 'head 里应有一段内联 <style>')
  assert.match(style, /--header-bg:/, '应定义半透明 header 背景变量')
  assert.match(style, /--font-sans:/, '应定义字体变量')
  assert.match(style, /box-sizing:\s*border-box/, '应有 * 重置')
  assert.match(style, /body\s*\{[\s\S]*radial-gradient/, 'body 背景（含渐变）应首屏生效')

  // 亮色是 :root 默认，暗色是 html[data-theme="dark"] 覆盖
  assertTokens(
    tokenBlock(style, ':root'),
    { '--bg': '#f7f8fa', '--text': '#101418', '--accent': '#1d4ed8', '--on-accent': '#ffffff' },
    '亮色主题',
  )
  assertTokens(
    tokenBlock(style, 'html[data-theme="dark"]'),
    { '--bg': '#0a0c10', '--text': '#eef2f7', '--accent': '#7aa2ff', '--on-accent': '#08090c' },
    '暗色主题',
  )

  // 主色是钢蓝、点缀是琥珀：两套 RGB 三元组必须跟着走，否则 rgba() 阴影会串色
  assert.match(tokenBlock(style, ':root'), /--accent-rgb:\s*29, 78, 216;/, '亮色主色 RGB 三元组')
  assert.match(tokenBlock(style, ':root'), /--hl-rgb:\s*180, 83, 9;/, '亮色点缀 RGB 三元组')
  assert.match(
    tokenBlock(style, 'html[data-theme="dark"]'),
    /--accent-rgb:\s*122, 162, 255;/,
    '暗色主色 RGB 三元组',
  )
  assert.match(
    tokenBlock(style, 'html[data-theme="dark"]'),
    /--hl-rgb:\s*255, 176, 103;/,
    '暗色点缀 RGB 三元组',
  )

  // 原生控件（滚动条、表单、UA 背景）跟随主题，而不是永远亮色
  assert.match(
    tokenBlock(style, ':root'),
    /color-scheme:\s*light;/,
    '亮色应声明 color-scheme: light',
  )
  assert.match(
    tokenBlock(style, 'html[data-theme="dark"]'),
    /color-scheme:\s*dark;/,
    '暗色应声明 color-scheme: dark',
  )

  // 紫色系令牌必须清干净：样式表里不能再出现旧的品牌紫
  for (const legacy of ['#9333ea', '#e05cff', '#8b5cf6']) {
    assert.ok(!style.toLowerCase().includes(legacy), `内联样式不应再含旧紫色 ${legacy}`)
  }

  // color-scheme + theme-color 要跟着中性底色走（首屏在 JS 之前就生效）
  assert.match(head, /<meta name="color-scheme" content="light dark"/, '应声明 color-scheme')
  assert.match(head, /<meta name="theme-color" content="#f7f8fa"/, 'theme-color 应是亮色背景')
})

test('首屏主题脚本：默认亮色，URL 与本地存储可覆盖', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8')
  const head = html.slice(0, html.indexOf('</head>'))
  const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(head)?.[1] ?? ''
  assert.ok(script.length > 0, 'head 里应有一段内联主题脚本')

  /**
   * 在隔离上下文里真跑一遍 head 脚本，返回写入的 data-theme，
   * 并顺带读回脚本给 <meta name="theme-color"> 写的值。
   */
  function resolveTheme({
    search = '',
    stored = null,
    throwOnRead = false,
  }: {
    search?: string
    stored?: string | null
    throwOnRead?: boolean
  }) {
    const store = new Map<string, string>()
    if (stored !== null) store.set('theme', stored)
    const meta = {
      content: '',
      setAttribute(name: string, value: string) {
        if (name === 'content') this.content = value
      },
    }
    const document = {
      documentElement: { dataset: {} as Record<string, string> },
      querySelector: (selector: string) => (selector.includes('theme-color') ? meta : null),
    }
    const localStorage = {
      getItem(key: string) {
        if (throwOnRead) throw new Error('blocked')
        return store.get(key) ?? null
      },
      setItem(key: string, value: string) {
        store.set(key, value)
      },
    }
    vm.runInNewContext(script, {
      URLSearchParams,
      location: { search },
      document,
      localStorage,
    })
    return { theme: document.documentElement.dataset.theme, themeColor: meta.content }
  }

  assert.deepEqual(
    resolveTheme({}),
    { theme: 'light', themeColor: '#f7f8fa' },
    '未存过选择时应默认亮色',
  )
  assert.equal(resolveTheme({ stored: 'dark' }).theme, 'dark', '用户切到暗色后应记住')
  assert.deepEqual(
    resolveTheme({ stored: 'dark' }),
    { theme: 'dark', themeColor: '#0a0c10' },
    '暗色主题的 theme-color 应是暗色背景',
  )
  assert.equal(resolveTheme({ stored: 'auto' }).theme, 'light', '脏存储值应落回亮色')
  assert.equal(
    resolveTheme({ search: '?theme=dark', stored: 'light' }).theme,
    'dark',
    'URL 优先级最高',
  )
  assert.equal(
    resolveTheme({ search: '?theme=blue', stored: 'dark' }).theme,
    'dark',
    '非法 URL 值不生效',
  )
  assert.equal(resolveTheme({ throwOnRead: true }).theme, 'light', 'localStorage 不可用时默认亮色')
})

test('仓库源码里没有 .css 文件', () => {
  const cssFiles = collectCssFiles(path.join(root, 'src'))
    .concat(collectCssFiles(path.join(root, 'webpack-plugins')))
    .concat(collectCssFiles(path.join(root, 'scripts')))
    .map((file) => path.relative(root, file))

  assert.deepEqual(cssFiles, [])
})
