'use client'

import { Package } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ItemImageProps {
  src?: string | null
  alt: string
  size: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function ItemImage({ src, alt, size, className }: ItemImageProps) {
  const [error, setError] = useState(false)

  const containerClass =
    size === 'lg'
      ? 'w-full aspect-square bg-gray-50 rounded-t-2xl flex items-center justify-center overflow-hidden'
      : size === 'xl'
      ? 'w-24 h-24 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0'
      : size === 'md'
      ? 'w-20 h-20 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0'
      : 'w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0'

  const iconClass =
    size === 'lg'
      ? 'h-16 w-16 text-gray-300'
      : size === 'xl'
      ? 'h-10 w-10 text-gray-300'
      : size === 'md'
      ? 'h-8 w-8 text-gray-300'
      : 'h-6 w-6 text-gray-300'

  const imgClass =
    size === 'lg'
      ? 'w-full h-full p-4'
      : size === 'xl'
      ? 'w-full h-full p-2'
      : size === 'md'
      ? 'w-full h-full p-2'
      : 'w-full h-full p-1.5'

  const showImage = src && !error

  return (
    <div className={cn(containerClass, className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          className={cn('object-contain', imgClass)}
        />
      ) : (
        <Package className={iconClass} />
      )}
    </div>
  )
}
