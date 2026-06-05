"use client"

import { useCallback, useEffect, useId, useRef, useState, type ComponentPropsWithoutRef } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

export interface AnimatedGridPatternProps extends ComponentPropsWithoutRef<"svg"> {
  width?: number
  height?: number
  x?: number
  y?: number
  strokeDasharray?: number
  numSquares?: number
  maxOpacity?: number
  duration?: number
  repeatDelay?: number
}

type Square = { id: number; pos: [number, number]; iteration: number }

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId()
  const containerRef = useRef<SVGSVGElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [squares, setSquares] = useState<Array<Square>>([])

  const getPos = useCallback((): [number, number] => [
    Math.floor((Math.random() * dimensions.width) / width),
    Math.floor((Math.random() * dimensions.height) / height),
  ], [dimensions.height, dimensions.width, height, width])

  const generateSquares = useCallback(
    (count: number) =>
      Array.from({ length: count }, (_, i) => ({ id: i, pos: getPos(), iteration: 0 })),
    [getPos]
  )

  const updateSquarePosition = useCallback(
    (squareId: number) => {
      setSquares((current) => {
        const sq = current[squareId]
        if (!sq || sq.id !== squareId) return current
        const next = current.slice()
        next[squareId] = { ...sq, pos: getPos(), iteration: sq.iteration + 1 }
        return next
      })
    },
    [getPos]
  )

  useEffect(() => {
    if (dimensions.width && dimensions.height) setSquares(generateSquares(numSquares))
  }, [dimensions.width, dimensions.height, generateSquares, numSquares])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions((cur) => {
          const w = entry.contentRect.width
          const h = entry.contentRect.height
          return cur.width === w && cur.height === h ? cur : { width: w, height: h }
        })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30", className)}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [sx, sy], id: sid, iteration }) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{ duration, repeat: 1, delay: sid * 0.1, repeatType: "reverse", repeatDelay }}
            onAnimationComplete={() => updateSquarePosition(sid)}
            key={`${sid}-${iteration}`}
            width={width - 1}
            height={height - 1}
            x={sx * width + 1}
            y={sy * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  )
}
