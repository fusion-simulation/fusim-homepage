import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'
import { WebpPlugin } from './webpack-plugins/webp.ts'

const root = path.dirname(fileURLToPath(import.meta.url))
const plugin = (name) => path.join(root, 'webpack-plugins', name)

/** dev server 的起始端口；被占用时从它开始 +1 找下一个可用端口。 */
const DEV_PORT = 5000

/** 试听一个端口，能 bind 就说明空闲（不传 host 时绑定 `::`，与 devServer 默认监听范围一致）。 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ port }, () => server.close(() => resolve(true)))
  })
}

/** 从 `start` 起找第一个空闲端口；被占用就自增，全满时给出明确报错。 */
async function findFreePort(start) {
  for (let port = start; port <= 65535; port++) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`[webpack] ${start}–65535 之间没有可用端口`)
}

/** OG 分享图与 JSON-LD logo 必须是 PNG（社交爬虫与结构化数据），跳过 WebP 转码、原样发进产物。 */
export const PASSTHROUGH_IMAGE_URLS = ['/og-image.png', '/logos/fusim-logo-512.png']

export default async (_env, argv) => {
  const mode = argv.mode ?? 'development'
  const isDev = mode !== 'production'
  const webp = new WebpPlugin({ serve: isDev, exclude: PASSTHROUGH_IMAGE_URLS })
  const port = isDev ? await findFreePort(DEV_PORT) : DEV_PORT

  if (isDev && port !== DEV_PORT) {
    console.log(`[webpack] ${DEV_PORT} 已被占用，dev server 改用 ${port}`)
  }

  return {
    mode,
    context: root,
    target: ['web', 'es2022'],
    entry: './src/main.tsx',
    output: {
      path: path.join(root, 'dist'),
      publicPath: '/',
      filename: isDev ? 'assets/[name].js' : 'assets/[name].[contenthash:8].js',
      chunkFilename: isDev ? 'assets/[name].js' : 'assets/[name].[contenthash:8].js',
      clean: true,
    },
    devtool: isDev ? 'eval-cheap-module-source-map' : false,
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    module: {
      rules: [
        {
          // oneOf：一个资源只走第一条命中的规则，避免 babel-loader 撞上虚拟模块
          oneOf: [
            {
              test: /virtual-publications\.js$/,
              use: [{ loader: plugin('publications.ts') }],
            },
            {
              test: /\.mdx$/,
              // 从右往左：先编译 MDX，再改写其中的图片引用
              use: [{ loader: plugin('webp-loader.ts') }, { loader: plugin('mdx.ts') }],
            },
            {
              test: /\.[cm]?[jt]sx?$/,
              exclude: /node_modules/,
              use: [
                { loader: plugin('webp-loader.ts') },
                {
                  loader: 'babel-loader',
                  options: {
                    babelrc: false,
                    configFile: false,
                    cacheDirectory: true,
                    presets: [
                      ['@babel/preset-typescript', { onlyRemoveTypeImports: true }],
                      ['@babel/preset-react', { runtime: 'automatic', development: isDev }],
                    ],
                    // Fast Refresh 的插桩在 dev 才加：生产产物里不该有 $RefreshReg$
                    plugins: isDev ? ['react-refresh/babel'] : [],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    plugins: [
      // 虚拟模块：`virtual:` 会被 webpack 当成 URI scheme（UnhandledSchemeError），
      // 用 NormalModuleReplacementPlugin 把请求换成一个真实文件，再由 loader 生成内容
      new webpack.NormalModuleReplacementPlugin(
        /^virtual:publications$/,
        plugin('virtual-publications.js'),
      ),
      webp,
      // dev 的 Fast Refresh 运行时与 hot 接收逻辑；插桩由上面的 react-refresh/babel 完成
      ...(isDev ? [new ReactRefreshWebpackPlugin({ overlay: false })] : []),
      new HtmlWebpackPlugin({
        // 模板仍是仓库根的 index.html：内联首屏样式与主题脚本原样保留，
        // 图片引用走和模块同一份改写集
        templateContent: () =>
          webp.tool.rewrite(fs.readFileSync(path.join(root, 'index.html'), 'utf8')),
        scriptLoading: 'module',
        inject: true,
      }),
    ],
    optimization: {
      splitChunks: { chunks: 'all' },
    },
    performance: { hints: false },
    stats: 'errors-warnings',
    devServer: {
      port,
      hot: true,
      historyApiFallback: true,
      static: { directory: path.join(root, 'public'), publicPath: '/', watch: false },
      devMiddleware: { publicPath: '/' },
      client: { overlay: { errors: true, warnings: false } },
      // 静态服务之前插入 WebP 中间件：public 里没有 .webp，排在后面会被 404 掉
      setupMiddlewares: (middlewares) => {
        middlewares.unshift(webp.middleware)
        return middlewares
      },
    },
  }
}
