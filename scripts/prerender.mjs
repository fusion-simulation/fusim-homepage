/**
 * 构建期预渲染：编 server bundle → 逐路由渲染 → 改写 dist/index.html 壳 → 生成
 * 404.html / sitemap.xml / robots.txt。dev（webpack serve）不跑这一步。
 */
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

for (const page of pages) {
  const file = path.join(distDir, htmlFileFor(page.url))
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, composeShell(shell, page, siteInfo))
}

const notFound = render(NOT_FOUND_PATH)
await writeFile(path.join(distDir, '404.html'), composeShell(shell, notFound, siteInfo))
await writeFile(path.join(distDir, 'sitemap.xml'), buildSitemap(pages, siteInfo))
await writeFile(path.join(distDir, 'robots.txt'), buildRobots(siteInfo))

console.log(`  ✓ 预渲染 ${pages.length} 页 · 404.html · sitemap.xml · robots.txt`)
