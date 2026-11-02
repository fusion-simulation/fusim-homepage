import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildResponsiveSrcSet,
  IMAGE_VARIANT_WIDTHS,
  imageVariantUrl,
  responsiveImageAttributes,
} from '../src/lib/responsive-image.ts'

test('IMAGE_VARIANT_WIDTHS 是共享的升序候选宽度', () => {
  assert.deepEqual([...IMAGE_VARIANT_WIDTHS], [480, 800, 1200, 1600])
})

test('imageVariantUrl：宽度插在扩展名前，保留目录、query 与 hash', () => {
  assert.equal(imageVariantUrl('/assets/image/a.webp', 480), '/assets/image/a-480.webp')
  assert.equal(imageVariantUrl('/assets/image/a.webp?v=2', 800), '/assets/image/a-800.webp?v=2')
  assert.equal(
    imageVariantUrl('/assets/image/a.webp#fig-1', 1200),
    '/assets/image/a-1200.webp#fig-1',
  )
  assert.equal(imageVariantUrl('a.webp', 1600), 'a-1600.webp')
  assert.equal(imageVariantUrl('/p/a.WebP?x=1#f', 480), '/p/a-480.WebP?x=1#f')
})

test('imageVariantUrl：query / hash 里的点不能被当成扩展名', () => {
  assert.equal(imageVariantUrl('/a.webp?v=1.2', 480), '/a-480.webp?v=1.2')
  assert.equal(imageVariantUrl('/a.webp#fig.2', 480), '/a-480.webp#fig.2')
  assert.equal(
    buildResponsiveSrcSet('/a.webp?v=1.2', 800),
    '/a-480.webp?v=1.2 480w, /a.webp?v=1.2 800w',
  )
})

test('buildResponsiveSrcSet：1000px 源图输出 480/800/1000', () => {
  assert.equal(
    buildResponsiveSrcSet('/assets/image/banana.webp', 1000),
    '/assets/image/banana-480.webp 480w, /assets/image/banana-800.webp 800w, /assets/image/banana.webp 1000w',
  )
})

test('buildResponsiveSrcSet：771px 源图只有 480 变体，base 用真实宽度', () => {
  assert.equal(
    buildResponsiveSrcSet('/assets/image/fisbone.webp', 771),
    '/assets/image/fisbone-480.webp 480w, /assets/image/fisbone.webp 771w',
  )
})

test('buildResponsiveSrcSet：800px 源图不重复 base', () => {
  assert.equal(
    buildResponsiveSrcSet('/assets/image/a.webp', 800),
    '/assets/image/a-480.webp 480w, /assets/image/a.webp 800w',
  )
})

test('buildResponsiveSrcSet：2100px 源图输出 480/800/1200/1600/2100', () => {
  assert.equal(
    buildResponsiveSrcSet('/assets/image/ppcfad02bcsupp2.webp', 2100),
    '/assets/image/ppcfad02bcsupp2-480.webp 480w, /assets/image/ppcfad02bcsupp2-800.webp 800w, /assets/image/ppcfad02bcsupp2-1200.webp 1200w, /assets/image/ppcfad02bcsupp2-1600.webp 1600w, /assets/image/ppcfad02bcsupp2.webp 2100w',
  )
})

test('buildResponsiveSrcSet：小于最小候选宽度的源图只保留 base', () => {
  assert.equal(
    buildResponsiveSrcSet('/assets/image/tiny.webp', 320),
    '/assets/image/tiny.webp 320w',
  )
})

test('buildResponsiveSrcSet：候选 URL 带 query/hash 时逐个保留', () => {
  assert.equal(
    buildResponsiveSrcSet('/assets/image/a.webp?v=3#top', 1000),
    '/assets/image/a-480.webp?v=3#top 480w, /assets/image/a-800.webp?v=3#top 800w, /assets/image/a.webp?v=3#top 1000w',
  )
})

test('responsiveImageAttributes：lazy + auto sizes + async decoding', () => {
  assert.deepEqual(responsiveImageAttributes('/assets/image/banana.webp', 1000), {
    src: '/assets/image/banana.webp',
    srcSet:
      '/assets/image/banana-480.webp 480w, /assets/image/banana-800.webp 800w, /assets/image/banana.webp 1000w',
    sizes: 'auto, 100vw',
    loading: 'lazy',
    decoding: 'async',
  })
})

test('responsiveImageAttributes：非 .webp 源图（构建期整组放弃）不拼 srcSet', () => {
  assert.deepEqual(responsiveImageAttributes('/assets/image/banana.gif', 1000), {
    src: '/assets/image/banana.gif',
    loading: 'lazy',
    decoding: 'async',
  })
})
