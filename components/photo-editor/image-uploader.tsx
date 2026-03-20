"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { uploadImage } from "@/services/cloudinary-service"
import type { UploadedImage } from "@/types/editor"
import { Trash2 } from "lucide-react"

interface ImageUploaderProps {
  sessionId: string
  isUploading: boolean
  isLoadingImages: boolean
  uploadedImages: UploadedImage[]
  onImageUpload: (newImages: UploadedImage[], newStoredImageIds: string[]) => void
  onImageSelect: (image: UploadedImage) => void
  onImageDelete: (imageId: string, publicId: string) => void
  activeSlot: string | null
  isDeletingImage?: string | null
  onDeleteConfirm?: (imageId: string, publicId?: string) => void
}

export function ImageUploader({
  sessionId,
  isUploading,
  isLoadingImages,
  uploadedImages,
  onImageUpload,
  onImageSelect,
  onImageDelete,
  activeSlot,
  isDeletingImage,
  onDeleteConfirm,
}: ImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<{ id: string; publicId?: string } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !sessionId) return

    setIsProcessing(true)
    const newImages: UploadedImage[] = []
    const newStoredImageIds: string[] = []

    try {
      for (const file of Array.from(files)) {
        // Upload ảnh lên Cloudinary
        const storedImage = await uploadImage(file, sessionId)

        // Thêm vào danh sách ảnh đã tải lên
        newImages.push({
          id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          url: storedImage.url, // Sử dụng URL từ Cloudinary
          position: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
          slotId: null,
          publicId: storedImage.publicId, // Lưu public ID của ảnh trên Cloudinary
        })

        newStoredImageIds.push(storedImage.id)
      }

      onImageUpload(newImages, newStoredImageIds)

      // Reset the input value to allow uploading the same file again
      e.target.value = ""
    } catch (error) {
      console.error("Error uploading images:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const openDeleteConfirm = (imageId: string, publicId?: string) => {
    if (onDeleteConfirm) {
      onDeleteConfirm(imageId, publicId)
    } else {
    setImageToDelete({ id: imageId, publicId })
    setDeleteConfirmOpen(true)
    }
  }

  const handleConfirmDelete = () => {
    if (!imageToDelete || !imageToDelete.publicId) {
      setDeleteConfirmOpen(false)
      return
    }

    // Chỉ gọi callback từ component cha, không tự gọi API xóa
    onImageDelete(imageToDelete.id, imageToDelete.publicId)

    // Cập nhật state local
    setDeleteConfirmOpen(false)
    setImageToDelete(null)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">Tải ảnh lên</h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading || isLoadingImages || !sessionId || isProcessing}
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="space-y-2">
                {isUploading || isLoadingImages || isProcessing ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Nhấp để tải ảnh lên</p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF lên đến 10MB</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {uploadedImages.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Ảnh đã tải lên ({uploadedImages.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square border rounded-md overflow-hidden cursor-pointer ${
                      image.slotId ? "border-primary" : "border-gray-200"
                    } group`}
                    onClick={() => {
                      if (activeSlot) {
                        onImageSelect(image)
                      }
                    }}
                    onMouseEnter={() => setHoveredImageId(image.id)}
                    onMouseLeave={() => setHoveredImageId(null)}
                  >
                    {/* Hiển thị trạng thái đang xóa */}
                    {isDeletingImage === image.id ? (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                        <div className="text-white text-sm flex flex-col items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white mb-2"></div>
                          <span>Đang xóa...</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Delete button - visible on hover */}
                    {hoveredImageId === image.id && !isDeletingImage && (
                      <button
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteConfirm(image.id, image.publicId)
                        }}
                        aria-label="Delete image"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa ảnh</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa ảnh này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
                {isDeletingImage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-white">Đang xóa...</span>
                </>
                ) : (
                <span className="text-white">Xóa ảnh</span>
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
