/**
 * 一次性生成社交分享图与 JSON-LD logo（产物已入库，构建不依赖本脚本）。
 * 品牌 SVG / 令牌色变化时手动重跑：node scripts/generate-social-assets.mjs
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BRAND = {
  bg: '#0a0c10',
  glowA: '#7aa2ff',
  glowB: '#ffb067',
  ink: '#eef2f7',
  /** 暖光只留一层薄雾：暗底上不透明度一高就是一块脏棕色。 */
  glowBOpacity: 0.12,
}

/** 现有 SVG 是纯黑填充，深色品牌底上必须换成浅墨色（源 SVG 不动）。 */
async function logoPng(svgRel, width) {
  const svg = (await readFile(path.join(root, svgRel), 'utf8')).replaceAll(
    'fill="#000000"',
    `fill="${BRAND.ink}"`,
  )
  return sharp(Buffer.from(svg)).resize({ width }).png().toBuffer()
}

/**
 * 品牌底（W×H），返回 SVG Buffer：`BRAND.bg` 实底 + 两个 radialGradient 辉光叠加 ——
 * a: cx 78% cy −8% r 62%，glowA 从 0.5 渐隐；b: cx 8% cy −4% r 58%，glowB 从 0.32 渐隐。
 * 色值与 index.html 里 body 背景的 --glow-a / --glow-b 同源。
 */
function backdrop(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="glow-a" cx="78%" cy="-8%" r="62%">
        <stop offset="0" stop-color="${BRAND.glowA}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${BRAND.glowA}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow-b" cx="8%" cy="-4%" r="58%">
        <stop offset="0" stop-color="${BRAND.glowB}" stop-opacity="${BRAND.glowBOpacity}"/>
        <stop offset="1" stop-color="${BRAND.glowB}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="${BRAND.bg}"/>
    <rect width="100%" height="100%" fill="url(#glow-a)"/>
    <rect width="100%" height="100%" fill="url(#glow-b)"/>
  </svg>`

  return Buffer.from(svg)
}

await sharp(backdrop(1200, 630))
  .composite([{ input: await logoPng('public/logos/fusim-logo-full.svg', 780), gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public/og-image.png'))

await sharp(backdrop(512, 512))
  .composite([
    { input: await logoPng('public/logos/fusim-logo-stacked.svg', 400), gravity: 'center' },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public/logos/fusim-logo-512.png'))

console.log('  ✓ public/og-image.png (1200×630)')
console.log('  ✓ public/logos/fusim-logo-512.png (512×512)')
