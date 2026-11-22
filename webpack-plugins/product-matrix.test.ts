import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cellAccessibilityText,
  compute,
  coverage,
  evidence,
  legend,
  processes,
  solvers,
} from '../src/content/product-matrix.ts'

const STATES = ['delivered', 'scoped', 'planned']

test('矩阵是 8 类物理过程，编号连续、key 唯一', () => {
  assert.equal(processes.length, 8)
  assert.deepEqual(
    processes.map((p) => p.no),
    ['01', '02', '03', '04', '05', '06', '07', '08'],
  )
  assert.equal(new Set(processes.map((p) => p.key)).size, 8)
})

test('每个格子都落在三种状态内，且都有文案', () => {
  for (const p of processes) {
    for (const cell of [p.saas, p.service]) {
      assert.ok(STATES.includes(cell.state), `${p.key} 状态非法：${cell.state}`)
      assert.ok(cell.text.trim().length > 0, `${p.key} 缺少文案`)
    }
  }
})

test('CBaldur 只认前三行，其余按需评估，不冒充已上线', () => {
  assert.deepEqual(
    processes.filter((p) => p.saas.state === 'delivered').map((p) => p.key),
    ['equilibrium', 'mhd', 'transport'],
  )
})

test('概览数字从数据派生，写死的数字对不上就失败', () => {
  assert.equal(coverage.processes, processes.length)
  assert.equal(coverage.solvers, solvers.length)
  assert.equal(coverage.evidence, evidence.length)
  assert.equal(coverage.devices, 2)
})

test('5 类求解器与算力结论都有出处', () => {
  assert.equal(solvers.length, 5)
  assert.ok(solvers.every((s) => s.label.length > 0 && s.text.length > 0))
  assert.match(compute.value, /2\.0/)
  assert.ok(evidence.length > 0 && evidence.every((e) => e.org && e.claim))
})

test('格子文案不含状态符号：符号只由 StateDot 渲染，不进文本层', () => {
  for (const p of processes) {
    for (const cell of [p.saas, p.service]) {
      assert.ok(!/[●○◯]/.test(cell.text), `${p.key} 的文案混进了状态符号：${cell.text}`)
    }
  }
})

test('每行都挂上了装置或案例，不留空标签列', () => {
  for (const p of processes) {
    assert.ok(p.devices.length > 0, `${p.key} 没有装置证据`)
  }
})

test('图例覆盖全部状态，且没有「不支持」', () => {
  assert.deepEqual(legend.map((l) => l.state).sort(), ['delivered', 'planned', 'scoped'])
  assert.ok(!legend.some((l) => /不支持|暂不|不可用/.test(l.label)))
})

test('格子文案不重复状态：文案本身就是状态名时不再补读一遍', () => {
  assert.equal(
    cellAccessibilityText({ state: 'delivered', text: '平衡求解器，云端即用' }),
    '已交付案例',
  )
  assert.equal(cellAccessibilityText({ state: 'scoped', text: '按需评估' }), '')
  assert.equal(cellAccessibilityText({ state: 'planned', text: '规划中' }), '')
})

test('每个格子的状态都能被读屏拿到（符号不是唯一载体）', () => {
  for (const process of processes) {
    for (const cell of [process.saas, process.service]) {
      const spoken = cellAccessibilityText(cell)
      assert.ok(
        spoken.length > 0 || cell.text.includes('评估'),
        `${process.key} 的 ${cell.state} 格既没有状态词也没有说明：${cell.text}`,
      )
    }
  }
})
