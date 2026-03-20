"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Undo } from "lucide-react"
import type { Template, UploadedImage, TemplateLayout } from "@/types/editor"

interface CanvasEditorProps {
  selectedTemplate: Template
  customLayout: TemplateLayout[]
  uploadedImages: UploadedImage[]
  activeSlot: string | null
  activeImage: UploadedImage | null
  isEditLayoutMode: boolean
  debugMode: boolean
  isFullscreen: boolean
  canvasZoom: number
  canvasPosition: { x: number; y: number }
  onSlotSelect: (slotId: string, e?: React.MouseEvent) => void
  onSlotDragStart: (e: React.MouseEvent, slotId: string) => void
  onCanvasMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onCanvasMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseUp: () => void
  onWheelZoom: (e: React.WheelEvent<HTMLDivElement>) => void
  onSlotResizeStart: (e: React.MouseEvent, slotId: string, direction: string) => void
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onToggleEditLayoutMode: () => void
  onToggleDebugMode: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onToggleFullscreen: () => void
}

export function CanvasEditor({
  selectedTemplate,
  customLayout,
  uploadedImages,
  activeSlot,
  activeImage,
  isEditLayoutMode,
  debugMode,
  isFullscreen,
  canvasZoom,
  canvasPosition,
  onSlotSelect,
  onSlotDragStart,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onMouseUp,
  onWheelZoom,
  onSlotResizeStart,
  onMouseDown,
  onToggleEditLayoutMode,
  onToggleDebugMode,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleFullscreen,
}: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isCanvasDragging, setIsCanvasDragging] = useState(false)
  const [isSlotDragging, setIsSlotDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  return (
    <div className={`${isFullscreen ? "flex-grow" : "md:w-2/3"}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Chỉnh sửa</h2>
        <div className="flex gap-2">
          <Button
            variant={isEditLayoutMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleEditLayoutMode}
            className="mr-2"
          >
            {isEditLayoutMode ? "Tắt chỉnh sửa layout" : "Chỉnh sửa layout"}
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleDebugMode} className="mr-2">
            {debugMode ? "Tắt Debug" : "Bật Debug"}
          </Button>
          <Button variant="outline" size="icon" onClick={onZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onResetView}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-gray-100"
        style={{
          height: isFullscreen ? "calc(100vh - 200px)" : "500px",
          cursor: isCanvasDragging
            ? "grabbing"
            : isSlotDragging
              ? "move"
              : isResizing
                ? "crosshair"
                : isDragging
                  ? "move"
                  : "grab",
        }}
        onMouseDown={(e) => onCanvasMouseDown(e)}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheelZoom}
      >
        {/* Canvas content */}
        <div
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasZoom})`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Hiển thị các slot trước (nằm dưới) */}
          {customLayout.map((slot) => {
            const image = uploadedImages.find((img) => img.slotId === slot.id)
            return (
              <div
                key={slot.id}
                className={`absolute border-2 ${
                  activeSlot === slot.id
                    ? "border-primary"
                    : isEditLayoutMode
                      ? "border-dashed border-blue-500"
                      : image
                        ? "border-transparent"
                        : "border-dashed border-gray-400"
                }`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.width}%`,
                  height: `${slot.height}%`,
                  cursor: isEditLayoutMode ? "move" : "pointer",
                  zIndex: 1, // Đảm bảo slot luôn nằm dưới frame
                }}
                onClick={(e) => {
                  if (!isEditLayoutMode) onSlotSelect(slot.id, e)
                }}
                onMouseDown={(e) => {
                  if (isEditLayoutMode) {
                    onSlotDragStart(e, slot.id)
                  } else if (image) {
                    onMouseDown(e)
                  }
                }}
              >
                {image ? (
                  <div className="w-full h-full overflow-hidden relative">
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={`Slot ${slot.id}`}
                      className="w-full h-full object-cover"
                      style={{
                        transform: `translate(${image.position.x}px, ${image.position.y}px) scale(${image.scale}) rotate(${image.rotation}deg)`,
                        transformOrigin: "center",
                      }}
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 bg-opacity-50">
                    <span className="text-sm text-gray-500">Chọn ảnh</span>
                  </div>
                )}

                {/* Resize handles - only show in edit layout mode */}
                {isEditLayoutMode && (
                  <>
                    <div
                      className="absolute top-0 left-0 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                      onMouseDown={(e) => onSlotResizeStart(e, slot.id, "nw")}
                    />
                    <div
                      className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-20"
                      onMouseDown={(e) => onSlotResizeStart(e, slot.id, "ne")}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-20"
                      onMouseDown={(e) => onSlotResizeStart(e, slot.id, "sw")}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                      onMouseDown={(e) => onSlotResizeStart(e, slot.id, "se")}
                    />
                  </>
                )}
                {isEditLayoutMode && debugMode && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                    x: {Math.round(slot.x)}, y: {Math.round(slot.y)}, w: {Math.round(slot.width)}, h:{" "}
                    {Math.round(slot.height)}
                  </div>
                )}
              </div>
            )
          })}

          {/* Frame (always on top) */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            <img
              src={selectedTemplate?.frameImage || "/placeholder.svg"}
              alt="Frame"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
