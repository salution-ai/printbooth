import Image from "next/image"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 24,
    md: 40,
    // lg: 64,
    lg: 128,
  }

  const pixelSize = sizeMap[size]

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Image src="/loading.gif" alt="Loading..." width={pixelSize} height={pixelSize} className="object-contain" />
    </div>
  )
}
