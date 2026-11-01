/**
 * 站点级数据，对应原 Lume 站点的 `data.ts`。
 */
export const site = {
  /** 生产域名（canonical / OG / sitemap / robots 的唯一来源）。 */
  url: 'https://www.fusim.cn',
  name: '聚核智算',
  slogan: '打造新一代聚变仿真工业软件',
  slogan2: '探索聚变仿真软件，为实现终极能源赋能',
  description:
    '聚核智算（FUSIM）是一家聚变等离子体软件SaaS服务商，致力于为科研机构和企业提供高效、精准的仿真解决方案，推动聚变能源技术的发展。',
  icp: '鄂ICP备2025165543号-1',
  mps: '鄂公网安备42018502008408号',
  email: 'info@fusim.cn',
  reports: [
    {
      title: '助力中国"人造太阳"取得关键突破',
      date: '2026-1-6',
      url: 'https://mp.weixin.qq.com/s/slOB-55vjSeG8Gr73ctfpw',
    },
  ],
  matrix: [
    {
      title: 'CBaldur',
      desp: '1.5D 磁约束聚变集成模拟软件',
      url: 'https://cbaldur.fusim.cn',
    },
    {
      title: '更多',
      desp: '敬请期待',
      url: '#',
    },
  ],
} as const
