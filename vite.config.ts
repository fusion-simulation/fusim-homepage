import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mdx } from './vite-plugins/mdx.ts'
import { publications } from './vite-plugins/publications.ts'
import { webpImages } from './vite-plugins/webp.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // mdx() 与 webpImages() 都是 enforce: 'pre'，同组内按数组顺序先 mdx 后 webp：
    // 编译后的 MDX 会先经本插件改写，再进入 react/webp 的正常管线
    mdx(),
    react(),
    publications(),
    webpImages(),
  ],
})
