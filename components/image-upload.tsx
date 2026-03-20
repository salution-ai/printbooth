"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ImagePlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

interface ImageUploadProps {
  onImageUpload: (url: string) => void
  defaultImage?: string
  className?: string
}

export function ImageUpload({ onImageUpload, defaultImage, className = "" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImage || null)
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

      // Upload to server
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()

      if (data.success && data.url) {
        onImageUpload(data.url)
        toast({
          title: "Tải lên thành công",
          description: "Ảnh đã được tải lên thành công",
        })
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Lỗi tải lên",
        description: "Có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.",
        variant: "destructive",
      })
      // Clear preview on error
      if (previewUrl && previewUrl !== defaultImage) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(defaultImage || null)
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

  return (
    <Card className={`relative flex flex-col items-center justify-center p-4 md:p-8 ${className}`}>
      {isUploading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {previewUrl ? (
        <div className="relative aspect-square h-48 w-48 overflow-hidden rounded-md">
          <Image
            src={previewUrl || "/placeholder.svg"}
            alt="Preview"
            fill
            style={{ objectFit: "cover" }}
            sizes="100%"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full opacity-70 hover:opacity-100"
            onClick={() => {
              if (previewUrl && previewUrl !== defaultImage) {
                URL.revokeObjectURL(previewUrl)
              }
              setPreviewUrl(defaultImage || null)
              onImageUpload("") // Clear the image URL
              if (fileInputRef.current) {
                fileInputRef.current.value = "" // Reset the file input
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`relative flex h-48 w-48 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground ${
            dragActive ? "border-primary" : ""
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <ImagePlus className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chọn hoặc kéo ảnh vào đây</p>
          </div>
        </div>
      )}
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileInputChange} />
    </Card>
  )
}
