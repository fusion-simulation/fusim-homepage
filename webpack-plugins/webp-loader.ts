import type { LoaderContext } from 'webpack'
import { webpToolFor } from './webp.ts'

/**
 * 把模块源码里的源图 URL 换成 `.webp`（规则里排在 tsc / mdx 左侧，拿到的是编译后的 JS）。
 *
 * 改写集由插件在编译前算好：build 只含本趟转码成功的条目（失败的原图保持引用），
 * dev 含全部条目（字节由 dev 中间件按需补）。
 */
export default function webpLoader(
  this: LoaderContext<Record<string, never>>,
  source: string,
): string {
  return webpToolFor(this.rootContext).rewrite(source)
}
