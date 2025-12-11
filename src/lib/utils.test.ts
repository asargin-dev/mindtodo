import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('should handle undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('should handle empty strings', () => {
    expect(cn('base', '', 'end')).toBe('base end')
  })

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge should deduplicate conflicting classes
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle arrays of class names', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('should handle objects with boolean values', () => {
    expect(cn({ active: true, disabled: false, hover: true })).toBe('active hover')
  })

  it('should handle mixed input types', () => {
    expect(cn('base', ['array-class'], { 'object-class': true })).toBe('base array-class object-class')
  })

  it('should return empty string when no classes provided', () => {
    expect(cn()).toBe('')
  })

  it('should handle Tailwind variants correctly', () => {
    expect(cn('hover:bg-blue-500', 'hover:bg-red-500')).toBe('hover:bg-red-500')
  })

  it('should handle responsive variants correctly', () => {
    expect(cn('md:px-4', 'md:px-8')).toBe('md:px-8')
  })
})
