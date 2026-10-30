import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'
import { WebpPlugin } from './webpack-plugins/webp.ts'

const root = path.dirname(fileURLToPath(import.meta.url))
const plugin = (name) => path.join(root, 'webpack-plugins', name)

export default (_env, argv) => {
  const mode = argv.mode ?? 'development'
  const isDev = mode !== 'production'
  const webp = new WebpPlugin({ serve: isDev })

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
              use: [
                { loader: plugin('webp-loader.ts') },
                { loader: plugin('mdx.ts') },
              ],
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
        templateContent: () => webp.tool.rewrite(fs.readFileSync(path.join(root, 'index.html'), 'utf8')),
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
      port: 5173,
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
