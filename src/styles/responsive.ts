/**
 * 容器响应式语义层：命名容器 + 集中档位。
 *
 * 全站原来用 23 处视口宽度媒体查询，组件无法跟着自己的可用宽度变化。
 * 这里把「组件在什么容器宽度下变形」收敛成一份语义表：
 * - `containers`：可查询的命名容器，避免嵌套时命中错误祖先；
 * - `containerSizes`：按用途命名的档位，业务样式只引用档位名；
 * - `container()` / `fromContainer()`：唯二的声明入口。
 *
 * 约定：
 * - 容器只声明 `container-type: inline-size`，元素不查询自身；
 * - 查询一律移动优先：默认紧凑，`width >= 档位` 再渐进增强；
 * - 查询阈值不支持 `var()`，所以数值在 TS 里插值，不写 CSS 变量。
 */

export const containers = {
  /** 页头：导航、CTA、主题/菜单按钮按页头实际宽度切换。 */
  siteHeader: 'site-header',
  /** 首屏：背景场景、标题、操作区、滚动提示。 */
  hero: 'hero',
  /** 首屏数据带：两列 → 四列。 */
  heroStats: 'hero-stats',
  /** 内容容器（Shell / Section）：首页区块与内页列表都按它变形。 */
  shell: 'shell',
  /** 页脚：站点地图列数。 */
  siteFooter: 'site-footer',
  /** 时间轴：日期列与正文列。 */
  timeline: 'timeline',
  /** 产品聚焦右下的虚拟控制台。 */
  productConsole: 'product-console',
  /** 正文：表格、媒体、卡片在窄容器里的降级。 */
  prose: 'prose',
} as const

export type ContainerName = (typeof containers)[keyof typeof containers]

export const containerSizes = {
  /** 单列操作区（按钮组、双列小卡）能否并排。 */
  actions: '40rem',
  /** 2×2 数据带能否铺成四列、页脚底行能否单行。 */
  stats: '47.5rem',
  /** 主分栏（工作流对比、产品聚焦、时间轴、页头导航）能否并排。 */
  split: '60rem',
  /** 三列网格能否一次铺满。 */
  threeUp: '67.5rem',
} as const

export type ContainerSize = keyof typeof containerSizes

/** 声明命名容器：只建立 inline-size 查询上下文，不耦合块级尺寸。 */
export function container(name: ContainerName): string {
  return `container: ${name} / inline-size;`
}

/** 移动优先的容器查询：默认紧凑布局，宽容器再渐进增强。 */
export function fromContainer(name: ContainerName, size: ContainerSize): string {
  return `@container ${name} (width >= ${containerSizes[size]})`
}
