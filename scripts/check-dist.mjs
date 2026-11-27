#!/usr/bin/env node
/**
 * 构建产物门禁：在 `dist/` 的静态 HTML 上断言 E2E 里踩过的那些坑。
 *
 * 这些都是「构建成功但页面不对」的问题（标题层级、canonical、图片 sizes……），
 * 单元测试碰不到，浏览器 E2E 又太慢，所以在预渲染产物上用正则做一次静态体检。
 * 用法：`npm run build && npm run check:dist`。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
// 与站点共用同一份「谁是当前导航项」的判定，避免门禁自己抄一遍再悄悄漂移
import { currentPageAttr, isActivePath } from '../src/lib/nav.ts'

const DIST = 'dist'
const NOT_FOUND_FILE = '404.html'

/** 收集 dist 下的 HTML 页面：`<route>/index.html` 加上根目录的 `404.html`。 */
function collectPages(dir) {
  const pages = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      pages.push(...collectPages(full))
    } else if (entry === 'index.html' || (dir === DIST && entry === NOT_FOUND_FILE)) {
      pages.push(full)
    }
  }

  return pages.sort()
}

/** dist/index.html → '/'，dist/about/index.html → '/about/'，dist/404.html → null。 */
function routeOf(file) {
  if (file === join(DIST, NOT_FOUND_FILE)) return null
  const parts = relative(DIST, file).split(sep)
  parts.pop()
  return parts.length === 0 ? '/' : `/${parts.join('/')}/`
}

const headingPattern = /<h([1-6])\b[^>]*>/g
const footerPattern = /<footer\b[\s\S]*?<\/footer>/g

/** 站点源从 sitemap 的第一个地址解析，避免把域名抄第二遍。 */
function siteOrigin() {
  let sitemap
  try {
    sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
  } catch {
    throw new Error('dist/sitemap.xml 不存在：先跑 npm run build')
  }

  const loc = sitemap.match(/<loc>([^<]+)<\/loc>/)
  if (!loc) throw new Error('sitemap.xml 里没有 <loc>')

  return new URL(loc[1]).origin
}

const problems = []

function fail(file, reason) {
  problems.push(`✗ ${file}: ${reason}`)
}

const files = (() => {
  try {
    return collectPages(DIST)
  } catch {
    console.error(`✗ 找不到 ${DIST}/：先跑 npm run build`)
    process.exit(1)
  }
})()
const origin = siteOrigin()

let imgCount = 0
let blankTargetCount = 0

for (const file of files) {
  const html = readFileSync(file, 'utf8')
  const route = routeOf(file)
  const isNotFound = route === null
  const label = isNotFound ? NOT_FOUND_FILE : route

  // ---------- 标题：单 h1、页脚无标题、层级不跳级 ----------
  const footers = html.match(footerPattern) ?? []

  for (const footer of footers) {
    if (/<h[1-6]\b/.test(footer)) fail(label, '页脚里出现了标题元素（栏目名应为非标题文本）')
  }

  const body = html.replace(footerPattern, '')
  const levels = [...body.matchAll(headingPattern)].map((match) => Number(match[1]))
  const h1Count = levels.filter((level) => level === 1).length

  if (h1Count !== 1) fail(label, `h1 数量为 ${h1Count}（期望 1）`)

  if (levels[0] !== 1) fail(label, `第一个标题是 h${levels[0]}（应为 h1）`)

  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      fail(label, `标题跳级：h${levels[i - 1]} → h${levels[i]}（第 ${i + 1} 个标题）`)
    }
  }

  // ---------- 当前页导航 ----------
  // 只对「导航里真有一项指向本页」的页面要求高亮：`/contact/`、`/responsibility/`、首页
  // 不在 NAV_ITEMS 里，合法地一个高亮也没有。
  const headerHtml = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? ''
  // 只算 <nav> 里的导航项：品牌 logo 与「预约合作」 CTA 也是 header 里的链接，但不参与高亮。
  const navHtml = headerHtml.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] ?? ''
  const navHrefs = [...navHtml.matchAll(/<a\b[^>]*href="(\/[^"]*)"[^>]*>/g)].map((match) => ({
    href: match[1],
    tag: match[0],
  }))

  const path = route ?? '/__404__/'
  const owning = navHrefs.filter((link) => isActivePath(path, link.href))
  const currentCount = (html.match(/aria-current="(?:page|true)"/g) ?? []).length

  if (owning.length > 1) {
    // 并列两个导航项都「拥有」本页时 UI 会双高亮——先当失败暴露，别默默放过
    fail(label, `多个导航项都指向本页：${owning.map((link) => link.href).join(', ')}`)
  } else if (owning.length === 1) {
    const { href, tag } = owning[0]
    // 本级页面用 page，只是祖先路径用 true（详情页里的「企业动态」不是当前页）
    const expected = currentPageAttr(path, href)
    const actual = tag.match(/aria-current="([a-z]+)"/)?.[1]

    if (actual !== expected) {
      fail(label, `${href} 的 aria-current 为 ${actual ?? '缺失'}（期望 ${expected}）`)
    }
    if (currentCount !== 1) {
      fail(label, `本页出现了 ${currentCount} 处 aria-current（期望 1）`)
    }
  } else if (currentCount !== 0) {
    fail(label, `没有导航项指向本页，却有 ${currentCount} 处 aria-current`)
  }

  // ---------- 图片 ----------
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    imgCount += 1
    if (!/\salt=/.test(tag)) fail(label, `图片缺 alt：${tag.slice(0, 90)}`)
  }

  for (const [value] of html.matchAll(/\ssizes="auto[^"]*"/g)) {
    fail(label, `sizes=${value.trim()} 会让整条声明失效回落 100vw（应给具体槽位）`)
  }

  // ---------- 外链 ----------
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    blankTargetCount += 1
    const rel = tag.match(/\srel="([^"]*)"/)?.[1] ?? ''
    if (!/noopener/.test(rel)) fail(label, `target="_blank" 缺 noopener：${tag.slice(0, 90)}`)
  }

  // ---------- canonical / robots ----------
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  const noindex = /<meta name="robots" content="noindex"/.test(html)

  if (isNotFound) {
    if (canonical) fail(label, `404 页不应写 canonical（实际 ${canonical}）`)
    if (!noindex) fail(label, '404 页缺 noindex')
  } else {
    const expected = `${origin}${route}`
    if (canonical !== expected)
      fail(label, `canonical 为 ${canonical ?? '缺失'}（期望 ${expected}）`)
    if (noindex) fail(label, 'indexable 页面不应写 noindex')
  }
}

const summary = `${files.length} 页 · ${imgCount} 张图 · ${blankTargetCount} 个外链`

if (problems.length > 0) {
  console.error(problems.join('\n'))
  console.error(`\n✗ ${problems.length} 个问题（${summary}）`)
  process.exit(1)
}

console.log(`✓ 全部通过（${summary}）`)
