"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown,
  ChevronUp,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  RotateCw,
  Layers,
  Save,
  Camera,
  Upload,
  Timer,
  Download,
  RefreshCw,
} from "lucide-react"

// Background options
const backgroundOptions = [
  { id: "white", name: "Trắng", color: "#ffffff" },
  { id: "blue", name: "Xanh dương", url: "/placeholder.svg?height=400&width=400" },
  { id: "green", name: "Xanh lá", url: "/placeholder.svg?height=400&width=400" },
  { id: "office", name: "Văn phòng", url: "/placeholder.svg?height=400&width=400" },
  { id: "studio", name: "Studio", url: "/placeholder.svg?height=400&width=400" },
]

interface UploadedImage {
  id: string
  url: string
  publicId?: string
  slotId?: string
  position: { x: number; y: number }
  scale: number
  rotation: number
}

interface CustomSlot {
  id: string
  imageId?: string
}

export default function EnhancedImageUpload() {
  // Existing states
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>("demo-session")
  const [isUploadAreaCollapsed, setIsUploadAreaCollapsed] = useState(false)
  const [isExpandedImageList, setIsExpandedImageList] = useState(true)
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState<UploadedImage | null>(null)
  const [customLayout, setCustomLayout] = useState<CustomSlot[]>([{ id: "slot-1" }, { id: "slot-2" }, { id: "slot-3" }])
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Camera states
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showProcessingDialog, setShowProcessingDialog] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [selectedBackground, setSelectedBackground] = useState<string>("white")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })
      setCameraStream(stream)

      // Đảm bảo video element được gán stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Đợi video load xong rồi mới play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.")
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
  }

  // Capture photo with timer
  const capturePhoto = (timerSeconds = 0) => {
    if (timerSeconds > 0) {
      setCountdown(timerSeconds)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(timer)
            takePhoto()
            return null
          }
          return prev ? prev - 1 : null
        })
      }, 1000)
    } else {
      takePhoto()
    }
  }

  // Take photo
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (context) {
        context.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg", 0.8)
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }

  // Simulate background removal (in real app, you'd use an AI service)
  const removeBackground = async (imageData: string) => {
    setIsRemovingBackground(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In a real implementation, you would send the image to a background removal service
    // For demo purposes, we'll just return the original image
    setProcessedImage(imageData)
    setIsRemovingBackground(false)
  }

  // Apply background
  const applyBackground = async (foregroundImage: string, backgroundOption: (typeof backgroundOptions)[0]) => {
    if (!canvasRef.current) return foregroundImage

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return foregroundImage

    return new Promise<string>((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height

        // Draw background
        if (backgroundOption.color) {
          context.fillStyle = backgroundOption.color
          context.fillRect(0, 0, canvas.width, canvas.height)
          context.drawImage(img, 0, 0)
          resolve(canvas.toDataURL("image/jpeg", 0.8))
        } else if (backgroundOption.url) {
          const bgImg = new Image()
          bgImg.crossOrigin = "anonymous"
          bgImg.onload = () => {
            context.drawImage(bgImg, 0, 0, canvas.width, canvas.height)
            context.drawImage(img, 0, 0)
            resolve(canvas.toDataURL("image/jpeg", 0.8))
          }
          bgImg.src = backgroundOption.url
        }
      }
      img.src = foregroundImage
    })
  }

  // Save processed image
  const saveProcessedImage = async () => {
    if (!processedImage) return

    const backgroundOption = backgroundOptions.find((bg) => bg.id === selectedBackground)
    if (!backgroundOption) return

    const finalImage = await applyBackground(processedImage, backgroundOption)

    const newImage: UploadedImage = {
      id: `camera-${Date.now()}`,
      url: finalImage,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
    }

    setUploadedImages((prev) => [...prev, newImage])

    // Reset states
    setCapturedImage(null)
    setProcessedImage(null)
    setShowProcessingDialog(false)
    setShowCameraDialog(false)
  }

  // Handle file upload (existing function)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setIsUploading(true)

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImage: UploadedImage = {
          id: `upload-${Date.now()}-${Math.random()}`,
          url: e.target?.result as string,
          position: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
        }
        setUploadedImages((prev) => [...prev, newImage])
      }
      reader.readAsDataURL(file)
    })

    setIsUploading(false)
    event.target.value = ""
  }

  // Other existing functions (simplified for brevity)
  const handleImageSelect = (image: UploadedImage) => {
    setActiveImage(image)
  }

  const openDeleteConfirm = (imageId: string, publicId?: string) => {
    setIsDeletingImage(imageId)
    setTimeout(() => {
      setUploadedImages((prev) => prev.filter((img) => img.id !== imageId))
      setIsDeletingImage(null)
    }, 1000)
  }

  const handlePositionXSlider = (value: number[]) => {
    if (activeImage) {
      const updatedImage = { ...activeImage, position: { ...activeImage.position, x: value[0] } }
      setActiveImage(updatedImage)
      setUploadedImages((prev) => prev.map((img) => (img.id === activeImage.id ? updatedImage : img)))
    }
  }

  const handlePositionYSlider = (value: number[]) => {
    if (activeImage) {
      const updatedImage = { ...activeImage, position: { ...activeImage.position, y: value[0] } }
      setActiveImage(updatedImage)
      setUploadedImages((prev) => prev.map((img) => (img.id === activeImage.id ? updatedImage : img)))
    }
  }

  const handleZoom = (value: number[]) => {
    if (activeImage) {
      const updatedImage = { ...activeImage, scale: value[0] }
      setActiveImage(updatedImage)
      setUploadedImages((prev) => prev.map((img) => (img.id === activeImage.id ? updatedImage : img)))
    }
  }

  const handleRotateSlider = (value: number[]) => {
    if (activeImage) {
      const updatedImage = { ...activeImage, rotation: value[0] }
      setActiveImage(updatedImage)
      setUploadedImages((prev) => prev.map((img) => (img.id === activeImage.id ? updatedImage : img)))
    }
  }

  const allSlotsHaveImages = () => {
    return customLayout.every((slot) => slot.imageId)
  }

  const generatePreview = () => {
    setIsGeneratingPreview(true)
    setTimeout(() => {
      setIsGeneratingPreview(false)
      alert("Preview generated!")
    }, 2000)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Thêm useEffect này sau các useEffect khác
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  return (
    <div className={`${isFullscreen ? "w-80" : "md:w-1/3"}`}>
      <Card className="mb-4">
        <CardContent className={`p-4 ${isUploadAreaCollapsed ? "pb-0" : ""}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Tải ảnh lên</h2>
            {isUploadAreaCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsUploadAreaCollapsed(false)
                  setIsExpandedImageList(true)
                }}
                className="h-6 px-2 text-xs"
              >
                <ChevronDown className="h-3 w-3 mr-1" /> Mở rộng
              </Button>
            )}
          </div>

          {!isUploadAreaCollapsed && (
            <>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="image-upload-edit"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading || isLoadingImages || !sessionId || isProcessing}
                />

                <div className="space-y-3">
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

                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Tải ảnh lên
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCameraDialog(true)}
                          className="flex items-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Chụp ảnh ngay
                        </Button>
                      </div>

                      <p className="text-xs text-gray-400">PNG, JPG, GIF lên đến 10MB</p>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`${isExpandedImageList ? "max-h-96" : "max-h-40"} overflow-y-auto mb-4 transition-all duration-300`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Ảnh đã tải lên ({uploadedImages.length})</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpandedImageList(!isExpandedImageList)}
                    className="h-6 px-2 text-xs"
                  >
                    {isExpandedImageList ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" /> Thu gọn
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" /> Mở rộng
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      className={`relative aspect-square border rounded-md overflow-hidden cursor-pointer group ${
                        activeImage?.id === image.id
                          ? "border-primary ring-2 ring-primary ring-opacity-50"
                          : "border-gray-200"
                      }`}
                      onClick={() => activeSlot && handleImageSelect(image)}
                      onMouseEnter={() => setHoveredImageId(image.id)}
                      onMouseLeave={() => setHoveredImageId(null)}
                    >
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />

                      {hoveredImageId === image.id && !image.slotId && !isDeletingImage && (
                        <button
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDeleteConfirm(image.id, image.publicId)
                          }}
                          aria-label="Delete image"
                          title="Xóa ảnh"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      )}

                      {isDeletingImage === image.id && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                          <div className="text-white text-sm flex flex-col items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mb-1"></div>
                            <span>Đang xóa...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsUploadAreaCollapsed(true)
                    setIsExpandedImageList(false)
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <ChevronUp className="h-3 w-3 mr-1" /> Thu gọn
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-4">Tùy chỉnh</h2>

          {activeSlot && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">
                  {activeSlot && customLayout.findIndex((slot) => slot.id === activeSlot) > -1
                    ? `Ảnh ${customLayout.findIndex((slot) => slot.id === activeSlot) + 1}`
                    : `Ảnh`}
                </h3>
                {activeImage && (
                  <>
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm flex items-center">
                          <MoveHorizontal className="h-4 w-4 mr-1" /> Di chuyển trái/phải
                        </span>
                        <span className="text-sm text-gray-500">{Math.round(activeImage.position.x)}</span>
                      </div>
                      <Slider
                        value={[activeImage.position.x]}
                        min={-100}
                        max={100}
                        step={1}
                        onValueChange={handlePositionXSlider}
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm flex items-center">
                          <MoveVertical className="h-4 w-4 mr-1" /> Di chuyển lên/xuống
                        </span>
                        <span className="text-sm text-gray-500">{Math.round(activeImage.position.y)}</span>
                      </div>
                      <Slider
                        value={[activeImage.position.y]}
                        min={-100}
                        max={100}
                        step={1}
                        onValueChange={handlePositionYSlider}
                      />
                    </div>
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm">Zoom</span>
                        <span className="text-sm text-gray-500">{Math.round(activeImage.scale * 100)}%</span>
                      </div>
                      <Slider value={[activeImage.scale]} min={0.5} max={4} step={0.01} onValueChange={handleZoom} />
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm">Xoay</span>
                        <span className="text-sm text-gray-500">{Math.round(activeImage.rotation)}°</span>
                      </div>
                      <Slider
                        value={[activeImage.rotation]}
                        min={0}
                        max={360}
                        step={1}
                        onValueChange={handleRotateSlider}
                      />
                      <div className="flex justify-between mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotateSlider([activeImage.rotation - 90])}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> 90°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotateSlider([activeImage.rotation + 90])}
                        >
                          <RotateCw className="h-4 w-4 mr-1" /> 90°
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!activeSlot && (
            <div className="text-center py-8 text-gray-500">
              <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chọn một slot để chỉnh sửa</p>
            </div>
          )}

          <div className="mt-6">
            <Button
              className="w-full"
              onClick={generatePreview}
              disabled={!allSlotsHaveImages() || isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chụp ảnh</DialogTitle>
            <DialogDescription>
              Sử dụng camera để chụp ảnh trực tiếp. Bạn có thể chụp ngay hoặc sử dụng hẹn giờ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!cameraStream && !capturedImage && (
              <div className="text-center py-8">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <Button onClick={startCamera}>
                  <Camera className="h-4 w-4 mr-2" />
                  Bật camera
                </Button>
              </div>
            )}

            {cameraStream && !capturedImage && (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-gray-100"
                    style={{ maxHeight: "400px" }}
                  />
                  {countdown && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                      <div className="text-white text-6xl font-bold animate-pulse">{countdown}</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-center">
                  <Button onClick={() => capturePhoto(0)}>
                    <Camera className="h-4 w-4 mr-2" />
                    Chụp ngay
                  </Button>
                  <Button variant="outline" onClick={() => capturePhoto(3)}>
                    <Timer className="h-4 w-4 mr-2" />
                    Hẹn giờ 3s
                  </Button>
                  <Button variant="outline" onClick={() => capturePhoto(5)}>
                    <Timer className="h-4 w-4 mr-2" />
                    Hẹn giờ 5s
                  </Button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="w-full rounded-lg" />
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => {
                      setCapturedImage(null)
                      startCamera()
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Chụp lại
                  </Button>
                  <Button
                    onClick={() => {
                      setShowProcessingDialog(true)
                      removeBackground(capturedImage)
                    }}
                  >
                    Xử lý ảnh
                  </Button>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* Processing Dialog */}
      <Dialog open={showProcessingDialog} onOpenChange={setShowProcessingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xử lý ảnh</DialogTitle>
            <DialogDescription>Tách nền và thay đổi background cho ảnh của bạn.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isRemovingBackground && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Đang tách nền...</p>
              </div>
            )}

            {processedImage && !isRemovingBackground && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ảnh gốc</h4>
                    <img
                      src={capturedImage || "/placeholder.svg"}
                      alt="Original"
                      className="w-full rounded-lg border"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ảnh đã xử lý</h4>
                    <img
                      src={processedImage || "/placeholder.svg"}
                      alt="Processed"
                      className="w-full rounded-lg border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Chọn nền:</label>
                  <Select value={selectedBackground} onValueChange={setSelectedBackground}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {backgroundOptions.map((bg) => (
                        <SelectItem key={bg.id} value={bg.id}>
                          {bg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowProcessingDialog(false)
                      setCapturedImage(null)
                      setProcessedImage(null)
                    }}
                  >
                    Hủy
                  </Button>
                  <Button onClick={saveProcessedImage}>
                    <Download className="h-4 w-4 mr-2" />
                    Lưu ảnh
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
