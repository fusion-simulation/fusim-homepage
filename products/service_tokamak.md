---
title: 托卡马克装置
description: 为托卡马克装置提供基于3D非线性混合磁流体代码NIMROD等程序的等离子体模拟解决方案服务
layout: layouts/base.vto
type: product
order: 11
desp: 模拟解决方案
prose: true
prose_card: true
product_section: service
---

##### 1. 高能量粒子与波粒相互作用模拟

   在磁约束聚变装置（如托卡马克）中，高能量粒子（如 α 粒子、中性束注入粒子）的轨道损失与不稳定性驱动是核心课题。

   香蕉轨道 (Banana Orbits) 追踪： 我们利用 NIMROD 的漂移动力学模型，精确还原托卡马克中束缚粒子的特殊运动轨迹。这对于理解新经典输运及粒子损失机制至关重要。

<img src="/assets/image/banana.gif" width = "1200" alt="图片名称" align=center loading="lazy" />


   鱼骨模 (Fishbone Mode) 演化： 模拟由高能粒子驱动的磁流体不稳定性。我们的方案能够捕捉非线性阶段的模结构演化，为实验中的振荡现象提供理论解释。

<img src="/assets/image/fisbone.gif" width = "1200" alt="图片名称" align=center loading="lazy" />

##### 2. 垂直位移事件 (VDE) 与装置安全
   对于大型托卡马克，等离子体失去垂直控制会导致强烈的机械冲击。

   VDE过程 (H.-L. Li 2021)： 我们利用 NIMROD 的抗性壁边界条件，模拟等离子体向上或向下的漂移运动，计算晕电流 (Halo Current) 分布及其对真空室壁的电磁力影响，助力装置的结构防护设计。
<img src="/assets/image/psi_pres_con.gif" width = "1200" alt="图片名称" align=center />

##### 3. 破裂缓解：大剂量气体注入 (MGI)
   等离子体破裂是聚变堆运行的最大威胁之一。
   
   MGI 模拟（S.-Y. Zeng 2022）： 模拟杂质气体注入等离子体后的冷却波传播、电流猝灭及能量沉积过程。我们的服务旨在通过数值实验，寻找最优的气体注入策略，以最大限度地降低破裂造成的损害。
<img src="/assets/image/ppcfad02bcsupp2.gif" width = "1200" alt="图片名称" align=center />

<style>
  .container, .content, main, article, .markdown-body {
    max-width: 2400px !important; /* 修改为你想要的宽度，或者 90% */
    padding-left: 20px;
    padding-right: 20px;
  }
</style>
