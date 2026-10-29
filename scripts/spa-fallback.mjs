/**
 * SPA 回退页：静态托管（GitHub Pages / nginx / 对象存储）通常会把未命中的路径
 * 交给 404.html，复制一份 index.html 即可让 wouter 客户端路由接管。
 */
import { copyFile } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')
const source = path.join(distDir, 'index.html')

await copyFile(source, path.join(distDir, '404.html'))
console.log('  ✓ dist/index.html → dist/404.html')
