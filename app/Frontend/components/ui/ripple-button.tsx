"use client"

import React, { type MouseEvent, useRef } from "react"
import { cn } from "@/lib/utils"

export interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string
  duration?: string
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      children,
      rippleColor = "rgba(255,255,255,0.35)",
      duration = "500ms",
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLButtonElement>(null)

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      const button = internalRef.current
      if (!button || disabled) return

      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - size / 2
      const y = event.clientY - rect.top - size / 2

      const ripple = document.createElement("span")
      ripple.style.cssText = `
        position:absolute;
        width:${size}px;
        height:${size}px;
        left:${x}px;
        top:${y}px;
        border-radius:50%;
        background-color:${rippleColor};
        transform:scale(0);
        animation:ripple-effect ${duration} linear;
        pointer-events:none;
      `
      button.appendChild(ripple)
      ripple.addEventListener("animationend", () => ripple.remove())
      onClick?.(event)
    }

    return (
      <button
        ref={(node) => {
          ;(internalRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
          if (typeof ref === "function") ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
        }}
        className={cn("relative overflow-hidden", className)}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

RippleButton.displayName = "RippleButton"
