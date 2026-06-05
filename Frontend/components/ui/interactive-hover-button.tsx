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
        "group relative flex items-center justify-center gap-2 overflow-hidden cursor-pointer font-bold",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {/* Black fill slides in from left on hover */}
      <div className="absolute inset-0 origin-left scale-x-0 bg-black transition-transform duration-500 ease-in-out group-hover:scale-x-100" />

      {/* Icon */}
      <span
        aria-hidden="true"
        className="relative z-10 transition-colors duration-500 group-hover:text-white"
      >
        {icon}
      </span>

      {/* Text */}
      <span
        aria-hidden="true"
        className="relative z-10 transition-colors duration-500 group-hover:text-white"
      >
        {text}
      </span>

      {/* Arrow slides in from left on hover */}
      <ArrowRight
        aria-hidden="true"
        className="relative z-10 h-4 w-4 -translate-x-2 opacity-0 transition-all duration-500 ease-in-out group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-white"
      />
    </button>
  )
})

InteractiveHoverButton.displayName = "InteractiveHoverButton"
