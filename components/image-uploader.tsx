"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, X, ImagePlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

interface ImageUploaderProps {
  onImageSelect: (imageUrl: string) => void
  className?: string
}

export function ImageUploader({ onImageSelect, className = "" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (file: File) => {
    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file hình ảnh",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "Kích thước file không được vượt quá 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Create preview URL
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Create form data
      const formData = new FormData()
      formData.append("file", file)

      // Upload to Cloudinary
      const uploadResponse = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }

      const uploadResult = await uploadResponse.json()

      if (uploadResult.success && uploadResult.url) {
        onImageSelect(uploadResult.url)
        toast({
          title: "Tải lên thành công",
          description: "Ảnh đã được tải lên thành công",
        })
      } else {
        throw new Error(uploadResult.error || "Upload failed")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Lỗi tải lên",
        description: "Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.",
        variant: "destructive",
      })
      // Clear preview on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0])
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleClearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  return (
    <Card
      className={`relative border-2 border-dashed rounded-lg ${
        dragActive ? "border-primary bg-primary/5" : "border-gray-300"
      } ${className}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center p-6 text-center h-full">
        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <LoadingSpinner size="md" />
            <p className="text-sm text-gray-500">Đang tải ảnh lên...</p>
          </div>
        ) : previewUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={previewUrl || "/placeholder.svg"}
              alt="Preview"
              fill
              className="object-contain rounded-md"
              sizes="(max-width: 768px) 100vw, 300px"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleClearPreview}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <ImagePlus className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-2 text-sm font-medium">Kéo thả ảnh vào đây hoặc nhấn để tải lên</p>
            <p className="text-xs text-gray-500 mb-4">Hỗ trợ JPG, PNG, GIF (tối đa 5MB)</p>
            <Button type="button" onClick={handleButtonClick} disabled={isUploading}>
              <Upload className="mr-2 h-4 w-4" />
              Chọn ảnh
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
