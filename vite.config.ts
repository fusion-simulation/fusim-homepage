import react from '@vitejs/plugin-react'
import { griffel } from '@griffel/vite-plugin'
import { defineConfig } from 'vite'
import { mdx } from './vite-plugins/mdx.ts'
import { publications } from './vite-plugins/publications.ts'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [mdx(), react(), griffel(), publications()],
  build: {
    // SSR 构建不需要再次拷贝 public/ 资源
    copyPublicDir: !isSsrBuild,
    // Griffel 通过 CSS 注释标记完成构建期样式抽取与排序，
    // 压缩会移除这些注释，导致 @media 规则无法排到基础规则之后。
    cssMinify: false,
  },
}))
