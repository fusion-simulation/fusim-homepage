import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const srcDir = path.join(root, 'src')
const stylesDir = path.join(srcDir, 'styles')
const responsivePath = path.join(stylesDir, 'responsive.ts')

/** 收集 src 下的 TS/TSX 源文件：视口媒体查询的约束覆盖整个 src，不只 styles 目录。 */
function collectSources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectSources(full, found)
    else if (/\.tsx?$/.test(entry.name)) found.push(full)
  }
  return found
}

test('container() 声明命名容器，按 inline-size 查询自身宽度', async () => {
  const { container } = await import(responsivePath)
  assert.equal(container('shell'), 'container: shell / inline-size;')
  assert.equal(container('site-header'), 'container: site-header / inline-size;')
})

test('fromContainer() 生成移动优先的容器查询', async () => {
  const { fromContainer } = await import(responsivePath)
  assert.equal(fromContainer('shell', 'split'), '@container shell (width >= 60rem)')
  assert.equal(fromContainer('hero', 'actions'), '@container hero (width >= 40rem)')
})

test('容器语义集中：命名容器与档位只在 responsive.ts 里定义', async () => {
  const { containers, containerSizes } = await import(responsivePath)

  assert.deepEqual(
    Object.values(containers).sort(),
    [
      'hero',
      'hero-stats',
      'product-console',
      'prose',
      'shell',
      'site-footer',
      'site-header',
      'timeline',
    ],
    '命名容器只应有这 8 个语义名字',
  )
  assert.deepEqual(containerSizes, {
    actions: '40rem',
    stats: '47.5rem',
    split: '60rem',
    threeUp: '67.5rem',
  })
})

test('src 里没有视口宽度媒体查询，容器查询只用 helper', () => {
  const files = collectSources(srcDir)
  assert.ok(files.length > 10, '应扫描到 src 下的多个源文件')

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const label = path.relative(root, file)

    assert.ok(!/@media\s*\(\s*(max|min)-width/.test(source), `${label} 不应再用视口宽度媒体查询`)

    if (file === responsivePath) continue

    assert.ok(!/@container/.test(source), `${label} 的容器查询必须走 fromContainer()`)
    assert.ok(!/container-type\s*:/.test(source), `${label} 的容器声明必须走 container()`)
  }
})

/**
 * 抽出 styled 模板里的 `${…}` 插值（含嵌套花括号），并记下它所在的 CSS 嵌套深度：
 * 深度 0 = 直接作用在组件自身，≥1 = 写在 `& > div { … }` 之类的子选择器里。
 */
function interpolations(source: string): Array<{ text: string; depth: number }> {
  const parts: Array<{ text: string; depth: number }> = []
  let depth = 0

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '$' && source[index + 1] === '{') {
      let cursor = index + 2
      let level = 1
      while (cursor < source.length && level > 0) {
        if (source[cursor] === '{') level += 1
        else if (source[cursor] === '}') level -= 1
        cursor += 1
      }
      parts.push({ text: source.slice(index + 2, cursor - 1), depth })
      index = cursor - 1
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') depth = Math.max(0, depth - 1)
  }

  return parts
}

test('容器不查询自身：顶层容器声明不能配顶层同名查询', () => {
  for (const file of readdirSync(stylesDir).filter((name) => name.endsWith('.ts'))) {
    const source = readFileSync(path.join(stylesDir, file), 'utf8')
    // 按顶层导出切块：一个块 = 一个 styled 组件 / 一段共享 css
    const blocks = source.split(/(?=\nexport (?:const|function|type|default) )/)

    for (const block of blocks) {
      const parts = interpolations(block)
      const declared = parts
        .filter((part) => part.depth === 0)
        .flatMap((part) => [...part.text.matchAll(/container\(containers\.(\w+)\)/g)])
        .map((match) => match[1])
      // 只有作用在组件自身（深度 0）的查询才是自查询；子选择器里查父容器是正确用法
      const selfQueries = parts
        .filter((part) => part.depth === 0)
        .flatMap((part) => [...part.text.matchAll(/fromContainer\(containers\.(\w+)/g)])
        .map((match) => match[1])
        .filter((name) => declared.includes(name))

      assert.deepEqual(
        [...new Set(selfQueries)],
        [],
        `${file} 里有一个块同时声明并查询了容器 ${selfQueries.join(', ')}：元素不是自己的查询容器`,
      )
    }
  }
})

test('容器查询是移动优先，阈值只能引用 containerSizes', () => {
  const source = readFileSync(responsivePath, 'utf8')

  // 唯一一处 @container 模板：宽容器渐进增强（width >= …）
  const queries = source.match(/@container[^`'\n]*/g) ?? []
  assert.equal(queries.length, 1, '容器查询模板应只有一处')
  assert.match(queries[0], /width\s*>=/, '查询方向必须是移动优先的 width >=')

  // 数值阈值只出现在 containerSizes 里，查询内只能插值引用
  assert.ok(!/width\s*[<>]=?\s*\d/.test(source), '查询里不应写死数值阈值，必须插值 containerSizes')
  assert.match(source, /@container \$\{name\} \(width >= \$\{containerSizes\[size\]\}\)/)
})
