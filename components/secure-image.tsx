"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import DevToolsProtector from "./devtools-protector"
import ImageCanvas from "./image-canvas"

interface SecureImageProps {
  src: string
  alt: string
  className?: string
  watermarkText?: string
  blurLevel?: number // 0-10, where 0 is no blur and 10 is maximum blur
}

function SecureImageContent({
  src,
  alt,
  className,
  watermarkText = "PHOTOLAB PREVIEW",
  blurLevel = 2,
}: SecureImageProps) {
  const [imageLoaded, setImageLoaded] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Prevent right-click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    return false
  }

  // Prevent drag
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault()
    return false
  }

  // Create watermark pattern
  useEffect(() => {
    if (!containerRef.current || !imageLoaded) return

    const container = containerRef.current
    const width = container.offsetWidth
    const height = container.offsetHeight

    // Create watermark overlay if it doesn't exist
    if (!container.querySelector(".watermark-overlay")) {
      const overlay = document.createElement("div")
      overlay.className = "watermark-overlay"
      overlay.style.position = "absolute"
      overlay.style.top = "0"
      overlay.style.left = "0"
      overlay.style.width = "100%"
      overlay.style.height = "100%"
      overlay.style.display = "flex"
      overlay.style.flexWrap = "wrap"
      overlay.style.justifyContent = "center"
      overlay.style.alignItems = "center"
      overlay.style.pointerEvents = "none"
      overlay.style.zIndex = "10"

      // Add diagonal watermarks
      for (let i = 0; i < 5; i++) {
        const watermark = document.createElement("div")
        watermark.textContent = watermarkText
        watermark.style.position = "absolute"
        watermark.style.color = "rgba(255, 255, 255, 0.7)"
        watermark.style.fontSize = "14px"
        watermark.style.fontWeight = "bold"
        const random = Math.random() * -50 // Generate a random number between 0 and 50
        watermark.style.transform = `rotate(-45deg) translate(${random}px, ${i * 50 - 100}px)`
        // watermark.style.textShadow = "1px 1px 2px rgba(0, 0, 0, 0.7)"
        watermark.style.userSelect = "none"
        overlay.appendChild(watermark)
      }

      container.appendChild(overlay)
    }
  }, [imageLoaded, watermarkText])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      style={{
      WebkitUserSelect: "none",
      userSelect: "none",
      }}
    >
      {/* Semi-transparent overlay */}
      <div
      className="absolute inset-0 z-10 pointer-events-none"
      style={{
        // backgroundColor: `rgba(255, 255, 255, 0.${blurLevel})`,
        // backdropFilter: `blur(${blurLevel / 2}px)`,
      }}
      />

      <ImageCanvas
      src={src || "/placeholder.svg"}
      alt={alt}
      className="w-full h-full object-contain"
      // onLoad={() => setImageLoaded(true)}
      />
    </div>
  )
}

export default function SecureImage(props: SecureImageProps) {
  return (
    <DevToolsProtector
      fallback={
        <div className="relative aspect-square rounded-lg overflow-hidden bg-red-50 flex items-center justify-center">
          <div className="text-center p-4">
            <h3 className="text-lg font-bold text-red-700">Phát hiện hành vi đáng ngờ!</h3>
            <p className="text-red-600 mt-1">Vui lòng đóng DevTools để xem hình ảnh.</p>
          </div>
        </div>
      }
    >
      <SecureImageContent {...props} />
    </DevToolsProtector>
  )
}
