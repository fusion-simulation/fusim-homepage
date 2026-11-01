/**
 * 构建期预渲染：编 server bundle → 逐路由渲染 → 改写 dist/index.html 壳 → 生成
 * 404.html / sitemap.xml / robots.txt。dev（webpack serve）不跑这一步。
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpack from 'webpack'
import { createModuleRules, PASSTHROUGH_IMAGE_URLS } from '../webpack.config.mjs'
import {
  buildRobots,
  buildSitemap,
  composeShell,
  htmlFileFor,
} from '../webpack-plugins/prerender.ts'
import { WebpPlugin } from '../webpack-plugins/webp.ts'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const distDir = path.join(root, 'dist')
const bundlePath = path.join(root, 'node_modules/.cache/fusim-prerender/server.cjs')

/** 只换 target / entry / output，loader 链与主编译同源（见 createModuleRules）。 */
const serverConfig = {
  mode: 'production',
  context: root,
  target: 'node',
  entry: './src/ssr.tsx',
  output: {
    path: path.dirname(bundlePath),
    filename: path.basename(bundlePath),
    publicPath: '/',
    library: { type: 'commonjs2' },
  },
  devtool: false,
  resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'] },
  module: { rules: [{ oneOf: createModuleRules({ isDev: false }) }] },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /^virtual:publications$/,
      path.join(root, 'webpack-plugins/virtual-publications.js'),
    ),
    // serve: true 只登记工具并算出改写集，不转码、不发资源（与 dev 同一套注册机制）
    new WebpPlugin({ serve: true, exclude: PASSTHROUGH_IMAGE_URLS }),
  ],
  optimization: { minimize: false },
  performance: { hints: false },
  stats: 'errors-warnings',
}

/** 跑一次编译：先 compiler.close()，再按 error / stats.hasErrors() reject 或 resolve。 */
function compileServer() {
  return new Promise((resolve, reject) => {
    const compiler = webpack(serverConfig)

    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error) return reject(error)
        if (closeError) return reject(closeError)
        if (stats?.hasErrors()) {
          return reject(new Error(stats.toString({ colors: true, errorDetails: true })))
        }
        resolve()
      })
    })
  })
}

await compileServer()

const require = createRequire(import.meta.url)
const { NOT_FOUND_PATH, render, routes, siteInfo } = require(bundlePath)

let shell
try {
  shell = await readFile(path.join(distDir, 'index.html'), 'utf8')
} catch (error) {
  throw new Error('[fusim:prerender] 读不到 dist/index.html：先跑 webpack 再跑本脚本', {
    cause: error,
  })
}

// 壳只读一次：首页那一页会覆盖 dist/index.html，后面的页面仍用同一份带 hash 资源引用的壳
const pages = routes.map((url) => render(url))

/** 页面 HTML 里可能出现的站内 `.webp` 引用形态：属性值（含 srcset）与 JSON 字符串。 */
const WEBP_REFERENCES = [
  /"([^"]*\.webp)"/g,
  /'([^']*\.webp)'/g,
  /(?:src|srcset|href|content)=(\/[^\s"'>]+\.webp)/g,
]

/**
 * 预渲染 HTML 里的 `.webp` 引用必须在 dist 里真有文件。
 *
 * serve 模式下 WebpTool 把所有源图引用都改写成 `.webp`，而客户端构建只改写「转码成功」的
 * 图片、失败时保留原图；转码一旦失败，预渲染页面就会指向一个没有发布过的 `.webp`。
 * 这种页面在无 JS 的爬虫眼里是坏图、在浏览器里是 hydration 属性不一致，构建期直接失败。
 */
function assertWebpAssets(html, url) {
  const seen = new Set()

  for (const pattern of WEBP_REFERENCES) {
    for (const [, ref] of html.matchAll(pattern)) {
      // 只查站内引用：外链与 data URL 不归产物管
      if (!ref.startsWith('/') || seen.has(ref)) continue
      seen.add(ref)

      // query / hash 不参与文件查找；编码坏掉的引用按原样去查，结果必然是缺文件而不是脚本崩溃
      const pathname = ref.split(/[?#]/, 1)[0]
      let decoded = pathname
      try {
        decoded = decodeURIComponent(pathname)
      } catch {}

      if (!existsSync(path.join(distDir, decoded))) {
        throw new Error(`[fusim:prerender] ${url} 引用了产物里不存在的图片：${ref}`)
      }
    }
  }
}

for (const page of pages) {
  const html = composeShell(shell, page, siteInfo)
  // 先校验再落盘：缺图的 HTML 不该进产物
  assertWebpAssets(html, page.url)
  const file = path.join(distDir, htmlFileFor(page.url))
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
}

const notFound = render(NOT_FOUND_PATH)
const notFoundHtml = composeShell(shell, notFound, siteInfo)
assertWebpAssets(notFoundHtml, NOT_FOUND_PATH)
await writeFile(path.join(distDir, '404.html'), notFoundHtml)
await writeFile(path.join(distDir, 'sitemap.xml'), buildSitemap(pages, siteInfo))
await writeFile(path.join(distDir, 'robots.txt'), buildRobots(siteInfo))

console.log(`  ✓ 预渲染 ${pages.length} 页 · 404.html · sitemap.xml · robots.txt`)
