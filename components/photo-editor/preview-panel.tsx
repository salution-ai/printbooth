"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { Template } from "@/types/editor"
import { Maximize2, Minimize2, Download } from "lucide-react"

interface PreviewPanelProps {
  selectedTemplate: Template
  slotImages: Record<number, string | null>
}

export function PreviewPanel({ selectedTemplate, slotImages }: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    generatePreview()
  }, [selectedTemplate, slotImages])

  const generatePreview = async () => {
    setIsGenerating(true)
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas size based on template dimensions
      const canvasSize = 1200
      canvas.width = canvasSize
      canvas.height = canvasSize

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Load and draw all slot images first
      await Promise.all(
        selectedTemplate.layout.map(async (slot) => {
          const slotId = slot.id
          const imageUrl = slotImages[Number.parseInt(slotId.replace("slot-", ""))]
          if (!imageUrl) return

          return new Promise<void>((resolve) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              // Calculate position and size based on slot dimensions
              const x = (slot.x / 100) * canvas.width
              const y = (slot.y / 100) * canvas.height
              const width = (slot.width / 100) * canvas.width
              const height = (slot.height / 100) * canvas.height

              // Calculate image dimensions while maintaining aspect ratio
              const imgAspectRatio = img.width / img.height
              const slotAspectRatio = width / height

              let imgWidth, imgHeight, offsetX, offsetY

              if (imgAspectRatio > slotAspectRatio) {
                // Image is wider than slot
                imgHeight = height
                imgWidth = imgHeight * imgAspectRatio
                offsetX = (width - imgWidth) / 2
                offsetY = 0
              } else {
                // Image is taller than slot
                imgWidth = width
                imgHeight = imgWidth / imgAspectRatio
                offsetX = 0
                offsetY = (height - imgHeight) / 2
              }

              // Save context for transformations
              ctx.save()
              // Create a clipping path for the slot
              ctx.beginPath()
              ctx.rect(x, y, width, height)
              ctx.clip()

              // Draw the image to fill the slot
              ctx.drawImage(img, x + offsetX, y + offsetY, imgWidth, imgHeight)

              // Restore context
              ctx.restore()
              resolve()
            }
            img.onerror = () => {
              console.error(`Failed to load image: ${imageUrl}`)
              resolve()
            }
            img.src = imageUrl
          })
        }),
      )

      // Then load and draw the frame on top
      if (selectedTemplate.frameImage) {
        await new Promise<void>((resolve) => {
          const frameImg = new Image()
          frameImg.crossOrigin = "anonymous"
          frameImg.onload = () => {
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)
            resolve()
          }
          frameImg.onerror = () => {
            console.error(`Failed to load frame: ${selectedTemplate.frameImage}`)
            resolve()
          }
          frameImg.src = selectedTemplate.frameImage
        })
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png")
      setPreviewUrl(dataUrl)
    } catch (error) {
      console.error("Error generating preview:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return

    const link = document.createElement("a")
    link.href = previewUrl
    link.download = `photolab-preview-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-white p-4" : ""}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Preview</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} disabled={!previewUrl || isGenerating}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={`relative ${isFullscreen ? "flex-grow flex items-center justify-center" : "h-64"}`}>
        {isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p>Generating preview...</p>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl || "/placeholder.svg"}
            alt="Preview"
            className={`
              ${isFullscreen ? "max-h-full max-w-full" : "w-full h-full"} 
              object-contain
            `}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p>Add images to slots to see preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
