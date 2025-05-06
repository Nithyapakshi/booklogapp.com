"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple dropdown menu without Radix UI dependency
export const DropdownMenu = ({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) => {
  return <div className="relative">{children}</div>
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center justify-center", className)} {...props}>
      {children}
    </button>
  ),
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "end" | "center"
    sideOffset?: number
    open?: boolean
  }
>(({ className, children, open, ...props }, ref) => {
  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md animate-in fade-in-80",
        "right-0 top-0 mt-8",
        className,
      )}
      style={{ zIndex: 9999 }} // Add explicit z-index to ensure visibility
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onClick?: () => void
  }
>(({ className, children, onClick, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100",
      className,
    )}
    onClick={(e) => {
      e.stopPropagation()
      onClick?.()
    }}
    {...props}
  >
    {children}
  </div>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

// Export empty components for compatibility
export const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuSubTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuSubContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuCheckboxItem = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuRadioItem = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const DropdownMenuSeparator = () => <div className="my-1 h-px bg-gray-200" />
export const DropdownMenuShortcut = ({ children }: { children: React.ReactNode }) => <>{children}</>
