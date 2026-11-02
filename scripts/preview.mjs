/**
 * 产物预览：本地静态服务 `dist/`，未命中的路径回退到 `404.html`（与部署环境一致）。
 * 替代 `vite preview`，不引入额外依赖。
 */
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')
const port = Number(process.env.PORT ?? 4173)

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

/**
 * 把 URL 路径安全地映射到 dist 内的文件。
 * 编码非法返回 undefined（调用方答 400）；越界返回 null（按未命中处理）。
 */
function resolveFile(pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return undefined
  }

  const target = path.resolve(distDir, `.${path.posix.normalize(`/${decoded}`)}`)
  const relative = path.relative(distDir, target)
  // 用 relative 判断越界，而不是字符串前缀：/dist-secret 之类的兄弟目录不会被误判为在内
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null

  return target
}

async function statFile(file) {
  try {
    const stats = await fs.stat(file)
    return stats.isFile() ? stats : null
  } catch {
    return null
  }
}

async function handle(req, res) {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const file = resolveFile(pathname)

  if (file === undefined) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('400：URL 编码非法')
    return
  }

  // 越界路径视为未命中，落到 404 分支
  let target = file ?? distDir
  let stats = await statFile(target)

  if (!stats && !path.extname(pathname)) {
    // 目录请求：补 index.html
    target = path.join(target, 'index.html')
    stats = await statFile(target)
  }

  if (!stats) {
    // 未命中的路径按部署环境的 404 文档处理：返回预渲染的 404.html，状态码 404
    target = path.join(distDir, '404.html')
    stats = await statFile(target)
    res.statusCode = 404

    if (!stats) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('404：产物里没有 404.html，先跑 npm run build')
      return
    }
  }

  res.setHeader('Content-Type', MIME_TYPES[path.extname(target)] ?? 'application/octet-stream')
  res.setHeader('Content-Length', stats.size)
  createReadStream(target).pipe(res)
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    // 单个请求出错只影响该请求，不能拖垮整个预览进程
    console.error(error)
    if (!res.headersSent) res.statusCode = 500
    res.end()
  })
})

// 只监听本机回环地址：预览服务不应暴露到局域网
server.listen(port, '127.0.0.1', () => {
  console.log(`  ➜  Local:   http://localhost:${port}/`)
})
