/**
 * Animation utilities and constants
 */

import { prefersReducedMotion } from './accessibility-utils'

/**
 * Animation duration constants (in milliseconds)
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
} as const

/**
 * Animation easing functions
 */
export const EASING = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

/**
 * Get animation duration respecting user preferences
 * @param duration - Desired duration
 * @returns Duration (0 if reduced motion preferred)
 */
export function getAnimationDuration(duration: number = ANIMATION_DURATION.normal): number {
  if (prefersReducedMotion()) {
    return 0
  }
  return duration
}

/**
 * Create transition style object
 * @param properties - CSS properties to animate
 * @param duration - Animation duration
 * @param easing - Easing function
 * @returns Transition style object
 */
export function createTransition(
  properties: string | string[],
  duration: number = ANIMATION_DURATION.normal,
  easing: string = EASING.easeInOut
): { transition: string } {
  const props = Array.isArray(properties) ? properties.join(', ') : properties
  const actualDuration = getAnimationDuration(duration)

  return {
    transition: `${props} ${actualDuration}ms ${easing}`,
  }
}

/**
 * Fade in animation
 */
export const fadeIn = {
  from: { opacity: 0 },
  to: { opacity: 1 },
  duration: ANIMATION_DURATION.normal,
}

/**
 * Fade out animation
 */
export const fadeOut = {
  from: { opacity: 1 },
  to: { opacity: 0 },
  duration: ANIMATION_DURATION.fast,
}

/**
 * Slide up animation
 */
export const slideUp = {
  from: { transform: 'translateY(10px)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
  duration: ANIMATION_DURATION.normal,
}

/**
 * Slide down animation
 */
export const slideDown = {
  from: { transform: 'translateY(-10px)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
  duration: ANIMATION_DURATION.normal,
}

/**
 * Scale animation
 */
export const scale = {
  from: { transform: 'scale(0.95)', opacity: 0 },
  to: { transform: 'scale(1)', opacity: 1 },
  duration: ANIMATION_DURATION.fast,
}

/**
 * Generate CSS keyframes string
 * @param name - Keyframe name
 * @param keyframes - Keyframe object
 * @returns CSS keyframes string
 */
export function generateKeyframes(
  name: string,
  keyframes: Record<string, Record<string, string | number>>
): string {
  const frames = Object.entries(keyframes)
    .map(([percentage, styles]) => {
      const styleString = Object.entries(styles)
        .map(([prop, value]) => `    ${prop}: ${value};`)
        .join('\n')
      return `  ${percentage} {\n${styleString}\n  }`
    })
    .join('\n')

  return `@keyframes ${name} {\n${frames}\n}`
}

/**
 * Check if animation should be disabled
 * @returns True if animations should be disabled
 */
export function shouldDisableAnimations(): boolean {
  return prefersReducedMotion()
}

/**
 * Get animation class name with reduced motion support
 * @param className - Animation class name
 * @param fallback - Fallback class when reduced motion is preferred
 * @returns Class name to use
 */
export function getAnimationClass(className: string, fallback: string = ''): string {
  if (shouldDisableAnimations()) {
    return fallback
  }
  return className
}

