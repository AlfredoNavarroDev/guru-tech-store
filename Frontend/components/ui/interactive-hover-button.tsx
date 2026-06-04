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
        "group relative overflow-hidden cursor-pointer font-bold",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {/* Default state: icon + text slide out on hover */}
      <span
        aria-hidden="true"
        className="relative z-10 flex items-center justify-center gap-2 transition-all duration-300 group-hover:translate-x-full group-hover:opacity-0"
      >
        {icon}
        {text}
      </span>

      {/* Hover state: text + arrow slide in */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 flex items-center justify-center gap-2 -translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
      >
        <span>{text}</span>
        <ArrowRight className="h-4 w-4" />
      </div>

      {/* Expanding dot — sits below z-10 overlays so it never occludes text */}
      <div className="absolute left-1/2 top-1/2 z-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-[#7cc527] transition-all duration-500 ease-in-out group-hover:scale-[20]" />
    </button>
  )
})

InteractiveHoverButton.displayName = "InteractiveHoverButton"
