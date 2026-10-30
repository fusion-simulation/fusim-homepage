import assert from 'node:assert/strict'
import test from 'node:test'
import { mathjax } from './mathjax.ts'

type TestNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: TestNode[]
}

const text = (value: string): TestNode => ({ type: 'text', value })

const element = (
  tagName: string,
  properties: Record<string, unknown> = {},
  children: TestNode[] = [],
): TestNode => ({ type: 'element', tagName, properties, children })

const root = (...children: TestNode[]): TestNode => ({ type: 'root', children })

async function transform(tree: TestNode): Promise<TestNode> {
  await mathjax()(tree as never)
  return tree
}

test('行内公式：替换为自带字形的 SVG，不引用外部 CSS / 字体', async () => {
  const tree = await transform(
    root(element('code', { className: ['language-math', 'math-inline'] }, [text('E = mc^2')])),
  )

  const wrapper = tree.children?.[0]
  assert.equal(wrapper?.tagName, 'span')
  assert.deepEqual(wrapper?.properties?.className, ['math', 'math-inline'])

  const svg = wrapper?.children?.[0]
  assert.equal(svg?.tagName, 'svg')

  const serialized = JSON.stringify(svg)
  assert.ok(serialized.includes('viewBox'), 'SVG 应带 viewBox')
  assert.ok(!serialized.includes('@font-face'), 'SVG 不应依赖 @font-face')
  assert.ok(!serialized.includes('url('), 'SVG 不应依赖外部字体资源')

  // 字形用 <use xLinkHref="#..."> 指向同一 SVG 内的 <defs>，不能指向外部文件
  const refs = [...serialized.matchAll(/"xLinkHref":"([^"]+)"/g)].map((match) => match[1])
  assert.ok(refs.length > 0, '应通过 <use> 引用内嵌字形')
  assert.ok(
    refs.every((ref) => ref.startsWith('#')),
    `字形引用必须指向文档内片段，实际：${refs.join(', ')}`,
  )
})

test('行间公式：连 <pre> 一起替换成居中的 div', async () => {
  const tree = await transform(
    root(
      element('pre', {}, [
        element('code', { className: ['language-math', 'math-display'] }, [
          text('\\int_0^1 x\\,dx'),
        ]),
      ]),
    ),
  )

  const wrapper = tree.children?.[0]
  assert.equal(wrapper?.tagName, 'div')
  assert.ok(
    (wrapper?.properties?.className as string[])?.includes('math-display'),
    '应保留 math-display 标记',
  )
  assert.match(String(wrapper?.properties?.style), /text-align:\s*center/)
  assert.ok(!JSON.stringify(tree).includes('"pre"'), '不应留下 <pre> 包裹')
})

test('非数学节点原样保留', async () => {
  const paragraph = element('p', {}, [text('hello')])
  const tree = await transform(root(paragraph))

  assert.deepEqual(tree.children?.[0], paragraph)
})

test('非法 TeX 不中断：仍产出 math-inline 包裹，不抛错', async () => {
  const tree = await transform(
    root(element('code', { className: ['language-math', 'math-inline'] }, [text('\\frac{')])),
  )

  const wrapper = tree.children?.[0]
  assert.equal(wrapper?.tagName, 'span')
  assert.ok((wrapper?.properties?.className as string[])?.includes('math-inline'))
})

test('相同公式命中缓存：输出完全一致（id 前缀相同）', async () => {
  const formula = () =>
    element('code', { className: ['language-math', 'math-inline'] }, [text('x^2')])

  const tree = await transform(root(formula(), text(' '), formula()))

  const first = JSON.stringify(tree.children?.[0])
  const second = JSON.stringify(tree.children?.[2])
  assert.equal(first, second)
})
