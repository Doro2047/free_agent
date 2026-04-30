import { describe, it, expect } from 'vitest'
import { cn } from '@/utils/cn'

describe('cn', () => {
  it('应合并多个 className', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('应处理条件 className', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('应处理 undefined 和 null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('应合并冲突的 Tailwind 类', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('应处理空输入', () => {
    expect(cn()).toBe('')
  })

  it('应处理数组输入', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })
})
