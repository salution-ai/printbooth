"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { RotateCw, RotateCcw, Layers, Save } from "lucide-react"
import type { UploadedImage } from "@/types/editor"
import { LoadingSpinner } from "@/components/loading-spinner"

interface ImageControlsProps {
  activeSlot: string | null
  activeImage: UploadedImage | null
  uploadedImages: UploadedImage[]
  isGeneratingPreview: boolean
  allSlotsHaveImages: boolean
  onImageSelect: (image: UploadedImage) => void
  onZoomChange: (value: number[]) => void
  onRotateChange: (value: number[]) => void
  onGeneratePreview: () => void
}

export function ImageControls({
  activeSlot,
  activeImage,
  uploadedImages,
  isGeneratingPreview,
  allSlotsHaveImages,
  onImageSelect,
  onZoomChange,
  onRotateChange,
  onGeneratePreview,
}: ImageControlsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-bold mb-4">Tùy chỉnh</h2>

        {activeSlot && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Slot {activeSlot}</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square border rounded-md overflow-hidden cursor-pointer ${
                      activeImage?.id === image.id
                        ? "border-primary ring-2 ring-primary ring-opacity-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => onImageSelect(image)}
                  >
                    <img src={image.url || "/placeholder.svg"} alt="Uploaded" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {activeImage && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Zoom</span>
                    <span className="text-sm text-gray-500">{Math.round(activeImage.scale * 100)}%</span>
                  </div>
                  <Slider value={[activeImage.scale]} min={0.5} max={3} step={0.01} onValueChange={onZoomChange} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Xoay</span>
                    <span className="text-sm text-gray-500">{Math.round(activeImage.rotation)}°</span>
                  </div>
                  <Slider value={[activeImage.rotation]} min={0} max={360} step={1} onValueChange={onRotateChange} />
                  <div className="flex justify-between mt-1">
                    <Button variant="outline" size="sm" onClick={() => onRotateChange([activeImage.rotation - 90])}>
                      <RotateCcw className="h-4 w-4 mr-1" /> 90°
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onRotateChange([activeImage.rotation + 90])}>
                      <RotateCw className="h-4 w-4 mr-1" /> 90°
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!activeSlot && (
          <div className="text-center py-8 text-gray-500">
            <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chọn một slot để chỉnh sửa</p>
          </div>
        )}

        <div className="mt-6">
          <Button className="w-full" onClick={onGeneratePreview} disabled={!allSlotsHaveImages || isGeneratingPreview}>
            {isGeneratingPreview ? (
              <>
                <LoadingSpinner size="sm" />
                Đang tạo...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Xem trước
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
