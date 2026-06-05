"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--border-radius": "12px",
          // vivid error
          "--error-bg": "#dc2626",
          "--error-text": "#ffffff",
          "--error-border": "transparent",
          // vivid success
          "--success-bg": "#16a34a",
          "--success-text": "#ffffff",
          "--success-border": "transparent",
          // vivid warning
          "--warning-bg": "#d97706",
          "--warning-text": "#ffffff",
          "--warning-border": "transparent",
          // vivid info
          "--info-bg": "#2563eb",
          "--info-text": "#ffffff",
          "--info-border": "transparent",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
