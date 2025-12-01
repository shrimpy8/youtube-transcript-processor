import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant of the skeleton
   * @default "default"
   */
  variant?: "default" | "circular" | "text" | "rectangular"
  /**
   * Animation state
   * @default true
   */
  animate?: boolean
}

/**
 * Skeleton component for loading states
 * Provides visual placeholder while content is loading
 */
export function Skeleton({
  className,
  variant = "default",
  animate = true,
  ...props
}: SkeletonProps) {
  const baseClasses = "bg-muted"
  const variantClasses = {
    default: "rounded-md",
    circular: "rounded-full",
    text: "rounded",
    rectangular: "rounded-none",
  }
  const animationClasses = animate ? "animate-pulse" : ""

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses,
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
}

