"use client"

import React from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  icon?: React.ReactNode
}

export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ className, text, icon, disabled, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={text}
      className={cn(
        "group flex items-center justify-center gap-2 cursor-pointer font-bold",
        "transition-all duration-500 ease-in-out",
        "hover:bg-black hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>

      <span aria-hidden="true">{text}</span>

      {/* Arrow slides in on hover */}
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-500 ease-in-out group-hover:translate-x-0 group-hover:opacity-100"
      />
    </button>
  )
})

InteractiveHoverButton.displayName = "InteractiveHoverButton"
