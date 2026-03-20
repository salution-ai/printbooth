"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import type { Template } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { uploadImage } from "@/services/cloudinary-service"
import { useSession } from "@/hooks/use-session"
import { Loader2 } from "lucide-react"

interface CanvasEditorProps {
  selectedTemplate: Template
  onSlotImageChange: (slotId: number, imageUrl: string | null) => void
  slotImages: Record<number, string | null>
  isLayoutEditMode: boolean
  onSlotUpdate: (updatedSlot: any) => void
  onZoomChange: (zoom: number) => void
  zoom: number
}

export function CanvasEditor({
  selectedTemplate,
  onSlotImageChange,
  slotImages,
  isLayoutEditMode,
  onSlotUpdate,
  onZoomChange,
  zoom,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null)
  const [resizingSlot, setResizingSlot] = useState<{ id: number; direction: string } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [imageCache, setImageCache] = useState<Record<string, HTMLImageElement>>({})
  const [userImages, setUserImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { sessionId } = useSession()

  // Preload images to avoid CORS issues
  useEffect(() => {
    const preloadImages = async () => {
      const newCache: Record<string, HTMLImageElement> = { ...imageCache }

      // Preload frame image
      if (selectedTemplate.frameImage && !newCache[selectedTemplate.frameImage]) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = selectedTemplate.frameImage
        await new Promise((resolve) => {
          img.onload = resolve
        })
        newCache[selectedTemplate.frameImage] = img
      }

      // Preload slot images
      for (const slotId in slotImages) {
        const imageUrl = slotImages[slotId]
        if (imageUrl && !newCache[imageUrl]) {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.src = imageUrl
          await new Promise((resolve) => {
            img.onload = resolve
          })
          newCache[imageUrl] = img
        }
      }

      setImageCache(newCache)
    }

    preloadImages()
  }, [selectedTemplate, slotImages, imageCache])

  // Handle mouse wheel for zooming
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const newZoom = Math.max(0.5, Math.min(3, zoom + delta))
        onZoomChange(newZoom)
      }
    }

    const canvas = canvasRef.current
    if (canvas) {
      // Thêm tham số { passive: false } để có thể gọi preventDefault()
      canvas.addEventListener("wheel", handleWheel, { passive: false })
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel)
      }
    }
  }, [zoom, onZoomChange])

  const handleMouseDown = (e: React.MouseEvent, slotId: number) => {
    if (!isLayoutEditMode) return

    const slot = selectedTemplate.layout.find((s) => s.id === `slot-${slotId}`)
    if (!slot) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setDraggedSlot(slotId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedSlot !== null && isLayoutEditMode) {
      const slot = selectedTemplate.layout.find((s) => s.id === `slot-${draggedSlot}`)
      if (!slot) return

      const canvas = canvasRef.current
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const newX = (e.clientX - canvasRect.left - dragOffset.x) / zoom
      const newY = (e.clientY - canvasRect.top - dragOffset.y) / zoom

      onSlotUpdate({
        ...slot,
        x: Math.max(0, Math.min(100 - slot.width, newX)),
        y: Math.max(0, Math.min(100 - slot.height, newY)),
      })
    } else if (resizingSlot !== null && isLayoutEditMode) {
      const slot = selectedTemplate.layout.find((s) => s.id === `slot-${resizingSlot.id}`)
      if (!slot) return

      const canvas = canvasRef.current
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const direction = resizingSlot.direction

      let newWidth = slot.width
      let newHeight = slot.height
      let newX = slot.x
      let newY = slot.y

      if (direction.includes("e")) {
        newWidth = Math.max(10, Math.min(100 - slot.x, (e.clientX - canvasRect.left) / zoom - slot.x))
      }
      if (direction.includes("s")) {
        newHeight = Math.max(10, Math.min(100 - slot.y, (e.clientY - canvasRect.top) / zoom - slot.y))
      }
      if (direction.includes("w")) {
        const right = slot.x + slot.width
        newX = Math.max(0, Math.min(right - 10, (e.clientX - canvasRect.left) / zoom))
        newWidth = right - newX
      }
      if (direction.includes("n")) {
        const bottom = slot.y + slot.height
        newY = Math.max(0, Math.min(bottom - 10, (e.clientY - canvasRect.top) / zoom))
        newHeight = bottom - newY
      }

      onSlotUpdate({
        ...slot,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      })
    }
  }

  const handleMouseUp = () => {
    setDraggedSlot(null)
    setResizingSlot(null)
  }

  const handleResizeStart = (e: React.MouseEvent, slotId: number, direction: string) => {
    e.stopPropagation()
    if (!isLayoutEditMode) return
    setResizingSlot({ id: slotId, direction })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotId: number) => {
    const files = e.target.files
    if (!files || files.length === 0 || !sessionId) return

    try {
      setIsLoading(true)
      const file = files[0]

      // Upload ảnh lên Cloudinary
      const storedImage = await uploadImage(file, sessionId)

      // Cập nhật URL ảnh cho slot
      onSlotImageChange(slotId, storedImage.url)

      // Reset input
      e.target.value = ""
    } catch (error) {
      console.error("Error uploading image:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={canvasRef}
        className="relative flex-grow border rounded-lg overflow-hidden bg-gray-100"
        style={{
          width: "100%",
          height: "100%",
          cursor: draggedSlot !== null || resizingSlot !== null ? "grabbing" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
        >
          {/* Slots */}
          {selectedTemplate.layout.map((slot, index) => {
            const slotId = Number.parseInt(slot.id.replace("slot-", ""))
            return (
              <div
                key={slot.id}
                className={`absolute ${isLayoutEditMode ? "border-2 border-dashed border-blue-500" : ""}`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.width}%`,
                  height: `${slot.height}%`,
                  cursor: isLayoutEditMode ? "grab" : "pointer",
                  zIndex: draggedSlot === slotId ? 10 : 1,
                }}
                onMouseDown={(e) => handleMouseDown(e, slotId)}
              >
                {slotImages[slotId] ? (
                  <img
                    src={slotImages[slotId] || ""}
                    alt={`Slot ${slotId}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-500">Click to add image</span>
                  </div>
                )}

                {/* Resize handles (only visible in layout edit mode) */}
                {isLayoutEditMode && (
                  <>
                    <div
                      className="absolute top-0 left-0 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize"
                      onMouseDown={(e) => handleResizeStart(e, slotId, "nw")}
                    />
                    <div
                      className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize"
                      onMouseDown={(e) => handleResizeStart(e, slotId, "ne")}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize"
                      onMouseDown={(e) => handleResizeStart(e, slotId, "sw")}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
                      onMouseDown={(e) => handleResizeStart(e, slotId, "se")}
                    />
                  </>
                )}
              </div>
            )
          })}

          {/* Frame (always on top) */}
          {selectedTemplate.frameImage && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
              <img
                src={selectedTemplate.frameImage || "/placeholder.svg"}
                alt="Frame"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Image selection panel */}
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Select Image for Slot</h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: selectedTemplate.slots }).map((_, index) => {
            const slotId = index + 1
            return (
              <div key={slotId} className="p-2 border rounded-lg">
                <h4 className="text-sm font-medium mb-1">Slot {slotId}</h4>
                <div className="flex flex-col gap-2">
                  <div>
                    <input
                      type="file"
                      id={`image-upload-${slotId}`}
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, slotId)}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <label htmlFor={`image-upload-${slotId}`}>
                      <Button variant="outline" className="w-full" disabled={isLoading} asChild>
                        <span>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Upload Image"
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                  {slotImages[slotId] && (
                    <Button variant="destructive" size="sm" onClick={() => onSlotImageChange(slotId, null)}>
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
