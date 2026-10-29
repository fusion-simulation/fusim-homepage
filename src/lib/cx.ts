/** 拼接 className，过滤空值（不参与 Griffel 的原子类冲突消解）。 */
export function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}
