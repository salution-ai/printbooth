"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label: string
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string>(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Kiểm tra loại file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file hình ảnh",
        variant: "destructive",
      })
      return
    }

    // Kiểm tra kích thước file (giới hạn 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Lỗi",
        description: "Kích thước file không được vượt quá 10MB",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)

      // Tạo preview URL
      const localPreview = URL.createObjectURL(file)
      setPreview(localPreview)

      // Lấy thông tin upload preset và cloud name từ biến môi trường
      const cloudName = process.env.NEXT_PUBLIC_ADMIN_CLOUDINARY_CLOUD_NAME || "dowzsuwcj"
      const uploadPreset = process.env.NEXT_PUBLIC_ADMIN_CLOUDINARY_UPLOAD_PRESET || "admin_photolab_preset"

      // Tạo FormData để upload trực tiếp lên Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset)
      formData.append("cloud_name", cloudName)
      formData.append("folder", "photolab/admin/templates")

      // Upload trực tiếp lên Cloudinary từ client
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Cloudinary upload error:", errorData)
        throw new Error("Upload failed: " + errorData)
      }

      const data = await response.json()

      // Cập nhật URL từ Cloudinary
      onChange(data.secure_url)

      toast({
        title: "Thành công",
        description: "Tải ảnh lên thành công",
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải ảnh lên. Vui lòng thử lại sau.",
        variant: "destructive",
      })
      // Nếu lỗi, xóa preview
      if (preview && !value) {
        setPreview("")
      } else {
        setPreview(value)
      }
    } finally {
      setIsUploading(false)
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    onChange("")
    setPreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="border rounded-md p-4">
        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <div className="relative w-full">
              <div className="aspect-video relative rounded-md overflow-hidden border">
                <Image src={preview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              onClick={handleClick}
              className="border-2 border-dashed rounded-md w-full min-h-[200px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nhấp để tải ảnh lên</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (tối đa 10MB)</p>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
          />

          {!preview && (
            <Button type="button" onClick={handleClick} disabled={isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Tải ảnh lên
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
