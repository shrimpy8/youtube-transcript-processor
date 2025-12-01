import { describe, it, expect } from 'vitest'
import { designTokens } from '../design-tokens'

describe('design-tokens', () => {
  it('has light and dark color tokens', () => {
    expect(designTokens.colors.light).toBeDefined()
    expect(designTokens.colors.dark).toBeDefined()
    expect(designTokens.colors.light.background).toBe('#ffffff')
    expect(designTokens.colors.dark.background).toBe('#0a0a0a')
  })

  it('has spacing tokens', () => {
    expect(designTokens.spacing).toBeDefined()
    expect(designTokens.spacing.xs).toBe('0.25rem')
    expect(designTokens.spacing.sm).toBe('0.5rem')
    expect(designTokens.spacing.md).toBe('1rem')
  })

  it('has breakpoint tokens', () => {
    expect(designTokens.breakpoints).toBeDefined()
    expect(designTokens.breakpoints.mobile).toBe('640px')
    expect(designTokens.breakpoints.tablet).toBe('1024px')
    expect(designTokens.breakpoints.desktop).toBe('1280px')
  })

  it('has borderRadius tokens', () => {
    expect(designTokens.borderRadius).toBeDefined()
    expect(designTokens.borderRadius.sm).toBe('0.25rem')
    expect(designTokens.borderRadius.md).toBe('0.5rem')
    expect(designTokens.borderRadius.full).toBe('9999px')
  })
})





