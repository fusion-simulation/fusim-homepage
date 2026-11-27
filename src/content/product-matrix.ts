/**
 * 产品矩阵页的覆盖数据。
 *
 * 这是 /products/ 唯一的事实来源，全部取自已公开的 `bp.pdf` 与站内 MDX：
 * - 8 类物理过程 = BP「聚变专用物理模型矩阵」6 类 + 高能粒子、磁流体稳定性；
 * - 2 类装置 = 托卡马克、场反位形（FRC）。
 *
 * 状态只有三种，没有「不支持」：缺省即不列，不自我否定也不夸大。
 * CBaldur 侧只标前三行——站点既有文案是「覆盖从平衡到输运的完整物理链条」，
 * 其余五行统一「按需评估」，`webpack-plugins/product-matrix.test.ts` 锁住这条取值。
 */

/** 交付状态：已有交付案例 / 可按需评估 / 规划中。 */
export type DeliveryState = 'delivered' | 'scoped' | 'planned'

/** 矩阵格子：状态 + 一句「怎么用」。`text` 不含符号，符号由 `StateDot` 按 `state` 渲染。 */
export type MatrixCell = {
  state: DeliveryState
  text: string
}

/** 一行物理过程。 */
export type MatrixProcess = {
  no: string
  key: string
  label: string
  summary: string
  saas: MatrixCell
  service: MatrixCell
  /** 有案例支撑的装置。 */
  devices: readonly string[]
}

export const processes: readonly MatrixProcess[] = [
  {
    no: '01',
    key: 'equilibrium',
    label: '平衡与位形',
    summary: '位形、剖面与稳定性底图',
    saas: { state: 'delivered', text: '平衡求解器，云端即用' },
    service: { state: 'delivered', text: '托卡马克平衡场 · FRC 形成与平衡' },
    devices: ['托卡马克', '仿星器', 'FRC'],
  },
  {
    no: '02',
    key: 'mhd',
    label: '磁流体稳定性',
    summary: '稳定性判定与非线性演化',
    saas: { state: 'delivered', text: 'MHD 求解器，稳定性与演化' },
    service: { state: 'delivered', text: '鱼骨模等不稳定性演化' },
    devices: ['托卡马克', '仿星器', 'FRC'],
  },
  {
    no: '03',
    key: 'transport',
    label: '输运',
    summary: '能量与粒子输运剖面',
    saas: { state: 'delivered', text: '输运求解器，剖面输出' },
    service: { state: 'delivered', text: '输运剖面对比与实验验证' },
    devices: ['托卡马克', '仿星器', 'FRC'],
  },
  {
    no: '04',
    key: 'energetic',
    label: '高能粒子',
    summary: '高能粒子轨道与驱动的模',
    saas: { state: 'scoped', text: '按需评估' },
    service: { state: 'delivered', text: '香蕉轨道追踪 · 鱼骨模驱动' },
    devices: ['托卡马克', 'FRC'],
  },
  {
    no: '05',
    key: 'heating',
    label: '加热与电流驱动',
    summary: '加热、电流驱动与功率沉积',
    saas: { state: 'scoped', text: '按需评估' },
    service: { state: 'delivered', text: '加热效果验证' },
    devices: ['托卡马克'],
  },
  {
    no: '06',
    key: 'density',
    label: '密度极限',
    summary: '密度极限预测与运行窗口',
    saas: { state: 'scoped', text: '按需评估' },
    service: { state: 'delivered', text: '密度极限预测' },
    devices: ['托卡马克', 'EAST'],
  },
  {
    no: '07',
    key: 'wall',
    label: '器壁与热负荷',
    summary: 'PWI、热负荷与材料响应',
    saas: { state: 'scoped', text: '按需评估' },
    service: { state: 'delivered', text: 'PWI 与热负荷沉积' },
    devices: ['托卡马克'],
  },
  {
    no: '08',
    key: 'disruption',
    label: '破裂与缓解',
    summary: '破裂演化、晕电流与缓解',
    saas: { state: 'scoped', text: '按需评估' },
    service: { state: 'delivered', text: 'VDE 晕电流 · MGI 缓解' },
    devices: ['托卡马克'],
  },
]

export const compute = {
  label: '国产异构算力',
  value: '2.0×',
  // 2.0× 与「Intel 平台的 200%」是同一个结论的两种说法，不要再写「优于 200%」（那会读成 3×）。
  text: '典型算例最高加速；华为超算平台实测为 Intel 平台的 200%',
}

export const evidence: readonly { org: string; claim: string }[] = [
  { org: '中科院等离子体所', claim: '仿真-实验关键指标一致' },
  { org: '华为', claim: '国产聚变程序与国产算力首次适配' },
  { org: '星能玄光', claim: 'FRC 磁压缩模拟' },
  { org: '新奥能源研究院', claim: '氢硼研究基金立项' },
]

/**
 * 概览带里的「装置」只数构型，不数每行 `devices` 的证据标签
 * （那些标签里有 `FRC 磁压缩`、`EAST` 这类具体对象，口径不同）。
 */
export const devices: readonly string[] = ['托卡马克', '场反位形（FRC）']

export const coverage = {
  processes: processes.length,
  devices: devices.length,
  evidence: evidence.length,
}

/** `/products/` 的 meta description：数字跟着数据走，不在 meta.ts 里再抄一遍。 */
export const metaDescription = `覆盖 ${coverage.processes} 类聚变物理过程、${coverage.devices} 类装置的仿真能力，标准产品与定制方案两条交付路径。`

export const legend: readonly { state: DeliveryState; label: string }[] = [
  { state: 'delivered', label: '已交付案例' },
  { state: 'scoped', label: '按需评估' },
  { state: 'planned', label: '规划中' },
]

/**
 * 格子的读屏文案：`●/○` 与列名都是视觉提示，不能当作唯一载体。
 *
 * 文案本身已经是状态名时（「按需评估」那五格）返回空串，否则读屏会连念两遍。
 */
export function cellAccessibilityText(cell: MatrixCell): string {
  const label = legend.find((item) => item.state === cell.state)?.label ?? ''
  return label !== '' && label !== cell.text.trim() ? label : ''
}
