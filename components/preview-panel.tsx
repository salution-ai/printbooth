"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ShoppingCart } from "lucide-react"
import type { Template } from "@/types/editor"
import { LoadingSpinner } from "@/components/loading-spinner"

interface PreviewPanelProps {
  previewUrl: string
  selectedTemplate: Template | null
  isSavingToCart: boolean
  onDownloadPreview: () => void
  onAddToCart: () => void
  onBackToEdit: () => void
}

export function PreviewPanel({
  previewUrl,
  selectedTemplate,
  isSavingToCart,
  onDownloadPreview,
  onAddToCart,
  onBackToEdit,
}: PreviewPanelProps) {
  if (!previewUrl || !selectedTemplate) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Xem trước</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onDownloadPreview}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Preview"
              className="max-w-full max-h-[600px] object-contain border rounded-lg"
            />
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={onBackToEdit}>
              Quay lại chỉnh sửa
            </Button>
            <Button onClick={onAddToCart} disabled={isSavingToCart}>
              {isSavingToCart ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Thêm vào giỏ hàng
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-bold mb-4">Thông tin sản phẩm</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Loại khung:</span>
              <span className="font-medium">{selectedTemplate.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Số lượng ảnh:</span>
              <span className="font-medium">{selectedTemplate.slots}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Giá:</span>
              <span className="font-medium">99.000₫</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
