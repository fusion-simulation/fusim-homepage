import react from '@vitejs/plugin-react'
import { griffel } from '@griffel/vite-plugin'
import { defineConfig } from 'vite'
import { mdx } from './vite-plugins/mdx.ts'
import { publications } from './vite-plugins/publications.ts'
import { webpImages } from './vite-plugins/webp.ts'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    // mdx() 与 webpImages() 都是 enforce: 'pre'，同组内按数组顺序先 mdx 后 webp：
    // 编译后的 MDX 会先经本插件改写，再进入 react/griffel/vite:css 的正常管线
    mdx(),
    react(),
    griffel(),
    publications(),
    webpImages(),
  ],
  build: {
    // SSR 构建不需要再次拷贝 public/ 资源
    copyPublicDir: !isSsrBuild,
    // Griffel 通过 CSS 注释标记完成构建期样式抽取与排序，
    // 压缩会移除这些注释，导致 @media 规则无法排到基础规则之后。
    cssMinify: false,
  },
}))
