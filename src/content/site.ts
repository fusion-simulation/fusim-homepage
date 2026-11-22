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
      title: '聚核智算刘家兴博士荣获2026年度蔡诗东等离子体物理奖青年奖',
      date: '2026-10-25',
      url: '/press/wechat-liu-jiaxing-award/',
    },
    {
      title: '如何破解核聚变工业软件“卡脖子”难题？“聚核智算”科研团队实现关键破局',
      date: '2026-08-04',
      url: '/press/wechat-fusion-software-breakthrough/',
    },
    {
      title: '助力中国"人造太阳"取得关键突破',
      date: '2026-01-06',
      url: '/press/wechat-ehl-density/',
    },
  ],
} as const
