"use client"

import type React from "react"

// Thêm import Suspense từ React
import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { useSession } from "@/hooks/use-session"
import type { Template, UploadedImage, TemplateLayout, TemplateCategory } from "@/types/editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { uploadImage, getCartItems, deleteImage, uploadUserImage } from "@/services/cloudinary-service"
import { CategorySelector } from "@/components/photo-editor/category-selector"
import { getTemplatesFromDatabase, getTemplateCategories } from "@/app/actions/template-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// Thêm import cho icon Swap
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  Undo,
  Layers,
  Save,
  PlusCircle,
  Trash2,
  MoveHorizontal,
  MoveVertical,
  ChevronDown,
  ChevronUp,
  Repeat,
  Upload,
  Camera,
  RefreshCw,
  Timer,
  ArrowLeft,
  Printer,
} from "lucide-react"
import { PriceDisplay } from "@/components/price-display"
import { PriceOptions } from "@/components/price-options"
import type { PriceOption } from "@/types/price"
import { LoadingSpinner } from "@/components/loading-spinner"
// Import CopyNotification component
import { CopyNotification } from "@/components/copy-notification"
import Loading from "@/components/loading"
import ImageCanvas from "@/components/image-canvas"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@radix-ui/react-select"

const backgroundOptions = [
  { id: "white", name: "Trắng", color: "#ffffff" },
  { id: "blue", name: "Xanh dương", url: "/placeholder.svg?height=400&width=400" },
  { id: "green", name: "Xanh lá", url: "/placeholder.svg?height=400&width=400" },
  { id: "office", name: "Văn phòng", url: "/placeholder.svg?height=400&width=400" },
  { id: "studio", name: "Studio", url: "/placeholder.svg?height=400&width=400" },
]

/** Gửi JSON tới agent in trên máy booth (POST). Body: { imageDataUrl: string } */
async function postImageToBoothPrintService(imageDataUrl: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_BOOTH_PRINT_URL
  if (!url?.trim()) {
    throw new Error("MISSING_PRINT_URL")
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
  })
  if (!res.ok) {
    throw new Error(`In: ${res.status}`)
  }
}

/** Mở hộp thoại in của trình duyệt với ảnh (data URL hoặc URL http có CORS). */
async function printImageInBrowser(imageSrc: string): Promise<void> {
  const res = await fetch(imageSrc)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none"
    document.body.appendChild(iframe)
    const win = iframe.contentWindow
    const doc = iframe.contentDocument
    if (!win || !doc) {
      URL.revokeObjectURL(blobUrl)
      reject(new Error("Không tạo được khung in"))
      return
    }

    const style = doc.createElement("style")
    style.textContent =
      "@page{margin:0}html,body{margin:0;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100vh;object-fit:contain}"
    doc.head.appendChild(style)

    const img = doc.createElement("img")
    img.alt = ""
    img.onload = () => {
      win.focus()
      win.print()
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
        iframe.remove()
        resolve()
      }, 400)
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      iframe.remove()
      reject(new Error("Không tải ảnh để in"))
    }
    img.src = blobUrl
    doc.body.appendChild(img)
  })
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || "image/jpeg" })
}

export type BoothImageRow = { row_number: number; Image: string }

export type StartFrameEditorProps = {
  sectionId: string
  boothSlotCount: number
  boothImages: BoothImageRow[]
  onBack: () => void
}

/** Bản sao luồng /create (tabs Chọn mẫu / Chỉnh sửa / Xem trước) dùng sau khi booth đã có đủ ảnh. */
export function StartFrameEditor(props: StartFrameEditorProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#B84F6F]" />
          </div>
        </div>
      }
    >
      <StartFrameEditorInner {...props} />
    </Suspense>
  )
}

function StartFrameEditorInner({
  sectionId,
  boothSlotCount,
  boothImages,
  onBack,
}: StartFrameEditorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const isMobile = useMobile()
  const { sessionId, isLoading: isSessionLoading } = useSession()

  function boothRowsToUploaded(rows: BoothImageRow[]): UploadedImage[] {
    const sorted = [...rows].sort((a, b) => a.row_number - b.row_number)
    return sorted.map((row, i) => ({
      id: `booth-${sectionId}-${i}-${row.row_number}`,
      file: new File([], `slot-${i}.jpg`),
      url: row.Image,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      slotId: null,
    }))
  }

  // State for copy notification
  const [showCopyNotification, setShowCopyNotification] = useState(false)
  const [copyMessage, setCopyMessage] = useState("")

  // Di chuyển khai báo templates vào trong component
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])

  // State — hydrate từ ảnh booth (bước trước)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() =>
    boothRowsToUploaded(boothImages),
  )
  const [storedImageIds, setStoredImageIds] = useState<string[]>([]) // Lưu trữ ID của ảnh trên Cloudinary
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState<UploadedImage | null>(null)

  // State for image dragging
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // State for image resizing
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 })
  const [resizeDirection, setResizeDirection] = useState<string | null>(null)
  const [initialImageState, setInitialImageState] = useState<{
    scale: number
    position: { x: number; y: number }
  } | null>(null)

  const [officialUrl, setOfficialUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // State for fullscreen mode and canvas controls
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 })
  const [isCanvasDragging, setIsCanvasDragging] = useState(false)
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 })
  const [activeTab, setActiveTab] = useState<string>("template")

  // State for slot dragging and resizing
  const [isSlotDragging, setIsSlotDragging] = useState(false)
  const [slotDragStart, setSlotDragStart] = useState({ x: 0, y: 0 })
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null)
  const [customLayout, setCustomLayout] = useState<TemplateLayout[]>([])
  const [showLayoutControls, setShowLayoutControls] = useState(false)

  // State for slot resizing
  const [resizeSlotId, setResizeSlotId] = useState<string | null>(null)

  // Thêm state để kiểm soát chế độ chỉnh sửa layout
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false)

  // Thêm state debug mode
  const [debugMode, setDebugMode] = useState(false)

  // Thêm state để lưu trữ kích thước thực tế của khung ảnh
  const [frameRect, setFrameRect] = useState<{ width: number; height: number; x: number; y: number }>({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  })

  // Thêm state để lưu trữ kích thước ban đầu của frame
  const [initialFrameRect, setInitialFrameRect] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  // Thêm state để lưu trữ tỷ lệ khung hình gốc
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number>(1)
  const [isMounted, setIsMounted] = useState(false)

  // Thêm ref cho khung ảnh
  const frameRef = useRef<HTMLImageElement>(null)

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const categoriesContainerRef = useRef<HTMLDivElement>(null)

  // Thêm state để lưu trữ layout gốc của template
  const [originalLayout, setOriginalLayout] = useState<TemplateLayout[]>([])

  // Thêm state để lưu trữ kích thước chuẩn cho frame
  const [standardFrameSize] = useState({ width: 951, height: 498 })
  const [canvasFrameSize, setCanvasFrameSize] = useState<{ width: number | string, height: number | string }>({ width: "100%", height: "100%" })

  // Thêm state để lưu trữ kích thước thực tế của ảnh template
  const [templateImageSize, setTemplateImageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  // Thêm state để lưu trữ trạng thái loading
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [visibleCategories, setVisibleCategories] = useState<TemplateCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // State to track hovered image for delete button
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)

  // State for delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<{ id: string; publicId?: string } | null>(null)
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null)

  // State để kiểm soát việc mở rộng danh sách ảnh
  const [isExpandedImageList, setIsExpandedImageList] = useState(false)

  // Thêm state để kiểm soát việc hiển thị khu vực "Tải ảnh lên"
  // Thêm sau dòng const [isExpandedImageList, setIsExpandedImageList] = useState(false)
  const [isUploadAreaCollapsed, setIsUploadAreaCollapsed] = useState(false)
  const [isHoveringSlot, setIsHoveringSlot] = useState<string | null>(null)

  // State để kiểm tra quyền admin
  const [isAdmin, setIsAdmin] = useState(false)

  // State cho việc lưu layout
  const [isSavingLayout, setIsSavingLayout] = useState(false)
  const [selectedSlotForDelete, setSelectedSlotForDelete] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [isCustomizeCollapsed, setIsCustomizeCollapsed] = useState(false);

  // camera dialog state
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
  // const canvasRef = useRef<HTMLCanvasElement>(null)
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

    if (!sessionId) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu ảnh khi chưa có phiên làm việc.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      // Convert base64 to Blob
      const res = await fetch(finalImage)
      const blob = await res.blob()
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })

      const result = await uploadImage(file, sessionId)
      newImage.url = result.url
      newImage.file = file
      newImage.publicId = result.publicId

      toast({
        title: "Đã lưu ảnh",
        description: "Ảnh đã được lưu lên server.",
      })
    } catch (error) {
      console.error("Error uploading camera image:", error)
      toast({
        title: "Lỗi lưu ảnh",
        description: "Đã xảy ra lỗi khi lưu ảnh từ camera",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }

    setUploadedImages((prev) => [...prev, newImage])

    // Reset states
    setCapturedImage(null)
    setProcessedImage(null)
    setShowProcessingDialog(false)
    setShowCameraDialog(false)
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])
  // Thêm useEffect để kiểm tra quyền admin khi component được mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Kiểm tra xem có cookie admin_token không
        const cookies = document.cookie.split(";")
        const adminTokenCookie = cookies.find((cookie) => cookie.trim().startsWith("admin_token="))

        if (adminTokenCookie) {
          setIsAdmin(true)
        } else {
          // Nếu không có cookie, kiểm tra xem có query param admin=true không (cho mục đích debug)
          const urlParams = new URLSearchParams(window.location.search)
          const isAdminParam = urlParams.get("admin") === "Tulie!1@3"

          if (isAdminParam) {
            setIsAdmin(true)
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        setIsAdmin(false)
      }
    }

    checkAdminStatus()
  }, [])

  // Thêm useEffect để lấy templates từ database
  useEffect(() => {
    const fetchTemplates = async () => {
      console.log(`[${new Date().toISOString()}] CLIENT: Bắt đầu fetchTemplates`)
      const clientStartTime = Date.now()

      setIsLoadingTemplates(true)
      try {
        // Lấy danh sách templates từ database
        console.log(`[${new Date().toISOString()}] CLIENT: Gọi getTemplatesFromDatabase`)
        const templatesStartTime = Date.now()

        const templatesFromDb = await getTemplatesFromDatabase()
        const forBooth = templatesFromDb.filter((t) => t.slots === boothSlotCount)

        console.log(
          `[${new Date().toISOString()}] CLIENT: Nhận được kết quả từ getTemplatesFromDatabase sau ${Date.now() - templatesStartTime
          }ms, số lượng: ${templatesFromDb.length} (lọc ${boothSlotCount} slot: ${forBooth.length})`,
        )
        setTemplates(forBooth)
        setFilteredTemplates(forBooth)

        // Lấy danh sách categories từ database
        console.log(`[${new Date().toISOString()}] CLIENT: Gọi getTemplateCategories`)
        const categoriesStartTime = Date.now()

        const categoriesFromDb = await getTemplateCategories()

        console.log(
          `[${new Date().toISOString()}] CLIENT: Nhận được kết quả từ getTemplateCategories sau ${Date.now() - categoriesStartTime
          }ms`,
        )
        // Cập nhật categories nếu cần
        // setCategories(categoriesFromDb);

        if (templatesFromDb.length > 0 && !selectedTemplate) {
          // Tự động chọn template đầu tiên nếu chưa có template nào được chọn
          console.log(`[${new Date().toISOString()}] CLIENT: Tự động chọn template đầu tiên`)
          // handleTemplateSelect(templatesFromDb[0])
        }
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] CLIENT ERROR: Lỗi tải templates sau ${Date.now() - clientStartTime}ms:`,
          error,
        )
        toast({
          title: "Lỗi tải dữ liệu",
          description: "Không thể tải danh sách khung ảnh từ database",
          variant: "destructive",
        })
      } finally {
        console.log(
          `[${new Date().toISOString()}] CLIENT: Kết thúc fetchTemplates sau ${Date.now() - clientStartTime}ms`,
        )
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [toast, boothSlotCount])

  // Thêm useEffect để xử lý template từ URL parameter
  useEffect(() => {
    // Kiểm tra xem có parameter template trong URL không
    const templateId = searchParams.get("template")
    const categoryId = searchParams.get("category")

    // Nếu có templateId và templates đã được tải xong
    if (templateId && templates.length > 0 && !selectedTemplate) {
      // Tìm template tương ứng trong danh sách
      const templateFromUrl = templates.find((template) => template.id === templateId)

      if (templateFromUrl) {
        // Nếu tìm thấy template, tự động chọn và chuyển đến tab edit
        handleTemplateSelect(templateFromUrl)
        setActiveTab("edit")
      } else {
        // Nếu không tìm thấy template, hiển thị thông báo lỗi
        toast({
          title: "Không tìm thấy mẫu",
          description: "Mẫu khung ảnh bạn đang tìm không tồn tại hoặc đã bị xóa",
          variant: "destructive",
        })
      }
    } else if (categoryId && templates.length > 0 && !selectedTemplate) {
      filterTemplatesByCategory(categoryId)
    }
  }, [templates, searchParams, selectedTemplate, toast])

  // Add this useEffect to filter templates when selectedCategory changes
  useEffect(() => {
    if (templates.length > 0) {
      if (!selectedCategory) {
        setFilteredTemplates(templates)
      } else {
        const filtered = templates.filter(
          (template) => template.category && template.category.includes(selectedCategory),
        )
        setFilteredTemplates(filtered)
      }
    }
  }, [templates, selectedCategory])

  // Tính toán số lượng categories hiển thị dựa trên kích thước màn hình
  useEffect(() => {
    const calculateVisibleCategories = () => {
      const container = categoriesContainerRef.current
      if (!container || categories.length === 0) return

      const containerWidth = container.clientWidth
      const buttonWidth = 120 // Ước tính kích thước trung bình của mỗi button
      const maxButtons = Math.floor(containerWidth / buttonWidth)

      // Luôn hiển thị ít nhất 1 category
      const visibleCount = Math.max(1, maxButtons - 1) // Trừ 1 để dành chỗ cho nút "Xem thêm"

      if (showAllCategories || categories.length <= visibleCount) {
        setVisibleCategories(categories)
      } else {
        setVisibleCategories(categories.slice(0, visibleCount))
      }
    }

    calculateVisibleCategories()
    window.addEventListener("resize", calculateVisibleCategories)

    return () => {
      window.removeEventListener("resize", calculateVisibleCategories)
    }
  }, [categories, showAllCategories])

  // Thêm useEffect để lấy categories từ database
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const categoriesFromDb = await getTemplateCategories()
        setCategories(categoriesFromDb)

        // Mặc định hiển thị một số categories đầu tiên
        const initialVisibleCount = 5 // Số lượng categories hiển thị ban đầu
        setVisibleCategories(
          categoriesFromDb.length > initialVisibleCount
            ? categoriesFromDb.slice(0, initialVisibleCount)
            : categoriesFromDb,
        )
      } catch (error) {
        console.error("Error loading categories:", error)
        toast({
          title: "Lỗi tải dữ liệu",
          description: "Không thể tải danh sách danh mục từ database",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [toast])

  // Thêm useEffect để kiểm tra slot đã có ảnh chưa và điều chỉnh hiển thị khu vực "Tải ảnh lên"
  // Thêm sau các useEffect khác, trước các hàm xử lý
  useEffect(() => {
    if (activeTab === "edit" && selectedTemplate) {
      // Kiểm tra xem tất cả slot đã có ảnh chưa
      const allSlotsFilled = customLayout.every((slot) => {
        return uploadedImages.some((img) => img.slotId === slot.id)
      })

      // Nếu tất cả slot đã có ảnh, thu nhỏ khu vực "Tải ảnh lên"
      if (allSlotsFilled) {
        // Đặt timeout để không thu gọn ngay lập tức, cho user thấy được sự thay đổi
        setTimeout(() => {
          setIsExpandedImageList(false)
          setIsUploadAreaCollapsed(true)
        }, 500)
      } else {
        // Nếu còn slot chưa có ảnh, mở rộng khu vực "Tải ảnh lên"
        setIsExpandedImageList(true)
        setIsUploadAreaCollapsed(false)
      }
    }
    if (activeTab === "template") {
      // Khi chuyển về tab template, luôn mở rộng khu vực "Tải ảnh lên"
      console.log("reset canvas frame size")
      // setCanvasFrameSize({
      //   width: "100%",
      //   height: "100%"
      // })
    }
  }, [activeTab, selectedTemplate, customLayout, uploadedImages])

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

  // Thêm hàm lọc templates theo category
  const filterTemplatesByCategory = (categoryId: string | null) => {
    setSelectedCategory(categoryId)

    if (!categoryId) {
      // If no category is selected, show all templates
      setFilteredTemplates(templates)
    } else {
      // Filter templates by the selected category
      const filtered = templates.filter((template) => template.category && template.category.includes(categoryId))
      setFilteredTemplates(filtered)

      // Log for debugging
      if (debugMode) {
        console.log(`Filtering by category: ${categoryId}`)
        console.log(`Found ${filtered.length} templates out of ${templates.length}`)
      }
    }
  }

  // Hàm xử lý tải ảnh lên
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!sessionId) {
      toast({
        title: "Lỗi",
        description: "Không thể tải ảnh lên khi chưa có phiên làm việc.",
        variant: "destructive",
      })
      return
    }

    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await uploadUserImage(file, sessionId)
        return {
          id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: file,
          url: result.url,
          position: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
          slotId: null,
          publicId: result.publicId,
        }
      })

      const newImages = await Promise.all(uploadPromises)
      setUploadedImages((prevImages) => [...prevImages, ...newImages])

      toast({
        title: "Đã tải ảnh lên",
        description: `Đã tải lên ${files.length} ảnh`,
      })
    } catch (error) {
      console.error("Error uploading images:", error)
      toast({
        title: "Lỗi tải ảnh",
        description: "Đã xảy ra lỗi khi tải ảnh lên",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Hàm mở dialog xác nhận xóa
  const openDeleteConfirm = (imageId: string, publicId?: string) => {
    setImageToDelete({ id: imageId, publicId })
    setDeleteConfirmOpen(true)
  }

  // Hàm xác nhận xóa
  const handleConfirmDelete = () => {
    if (!imageToDelete || !imageToDelete.publicId) {
      setDeleteConfirmOpen(false)
      return
    }

    handleImageDelete(imageToDelete.id, imageToDelete.publicId)
  }

  // Hàm xử lý xóa ảnh
  const handleImageDelete = async (imageId: string, publicId: string) => {
    // Kiểm tra xem ảnh có đang được sử dụng trong slot nào không
    const imageToDelete = uploadedImages.find((img) => img.id === imageId)
    if (imageToDelete && imageToDelete.slotId) {
      // Nếu ảnh đang được sử dụng, hiển thị thông báo
      toast({
        title: "Không thể xóa ảnh",
        description: "Ảnh đang được sử dụng trong khung. Vui lòng gỡ ảnh khỏi khung trước khi xóa.",
        variant: "destructive",
      })
      return
    }

    // Nếu ảnh không được sử dụng, tiến hành xóa
    try {
      setIsDeletingImage(imageId)

      if (publicId && sessionId) {
        await deleteImage(publicId, sessionId)
      }

      // Xóa ảnh khỏi state
      setUploadedImages((prevImages) => {
        const newImages = prevImages.filter((img) => img.id !== imageId)
        return newImages
      })

      // Nếu ảnh đang được chọn, bỏ chọn
      if (activeImage && activeImage.id === imageId) {
        setActiveImage(null)
      }

      // Hiển thị thông báo thành công
      toast({
        title: "Đã xóa ảnh",
        description: "Ảnh đã được xóa thành công",
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        title: "Lỗi xóa ảnh",
        description: "Đã xảy ra lỗi khi xóa ảnh",
        variant: "destructive",
      })
    } finally {
      setIsDeletingImage(null)
      setDeleteConfirmOpen(false)
      setImageToDelete(null)
    }
  }

  // Kiểm tra xem có ảnh trong giỏ hàng không khi trang được tải
  useEffect(() => {
    const loadCartImages = async () => {
      if (!sessionId || isSessionLoading) return

      try {
        // Lấy các item trong giỏ hàng
        const cartItems = await getCartItems(sessionId)

        if (cartItems.length > 0) {
          // Hiển thị thông báo cho người dùng
          toast({
            title: "Giỏ hàng của bạn",
            description: `Bạn có ${cartItems.length} sản phẩm trong giỏ hàng`,
          })
        }
      } catch (error) {
        console.error("Error loading cart images:", error)
      }
    }

    if (sessionId && !isSessionLoading) {
      loadCartImages()
    }
  }, [sessionId, isSessionLoading, toast])

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    setCanvasFrameSize({
      width: "100%",
      height: "100%"
    })
    setSelectedTemplate(template)
    setActiveSlot(null)
    setActiveImage(null)
    setCanvasZoom(1)
    setCanvasPosition({ x: 0, y: 0 })

    // Lưu layout gốc của template
    setOriginalLayout([...template.layout])

    // Khởi tạo custom layout từ layout gốc
    setCustomLayout([...template.layout])

    setShowLayoutControls(false)

    // Reset initialFrameRect khi chọn template mới
    setInitialFrameRect({ width: 0, height: 0 })
    setOriginalAspectRatio(1)

    // Load kích thước thực tế của ảnh template
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setTemplateImageSize({
        width: img.width,
        height: img.height,
      })
      setOriginalAspectRatio(img.width / img.height)
      if (debugMode) {
        console.log(`Template image loaded: ${img.width}x${img.height}`)
      }
    }
    img.onerror = () => {
      console.error("Failed to load template image:", template.frameImage)
      // Fallback to standardFrameSize ratio
      setTemplateImageSize(standardFrameSize)
      setOriginalAspectRatio(standardFrameSize.width / standardFrameSize.height)
    }
    img.src = template.frameImage

    // Gán ảnh booth theo thứ tự vào từng slot của template
    setUploadedImages((images) =>
      images.map((img, i) => ({
        ...img,
        slotId: template.layout[i]?.id ?? null,
        slotPosition: undefined,
      })),
    )

    setActiveTab("edit")
    if (uploadedImages.length === 0) {
      toast({
        title: "Vui lòng tải ảnh lên",
        description: "Bạn cần tải ảnh lên để chỉnh sửa khung ảnh",
      })
    }
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 100)
  }

  // Thêm useEffect mới để theo dõi khi selectedTemplate thay đổi
  useEffect(() => {
    if (selectedTemplate) {
      // Chuyển sang tab edit khi đã chọn template
      setActiveTab("edit")
    }
  }, [selectedTemplate])

  // Thay đổi hàm handleSlotSelect để xử lý việc chọn slot
  const handleSlotSelect = (slotId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    setActiveSlot(slotId)

    // Find if there's already an image in this slot
    const imageInSlot = uploadedImages.find((img) => img.slotId === slotId)
    if (imageInSlot) {
      setActiveImage(imageInSlot)
    } else {
      setActiveImage(null)
    }
  }

  // Thêm hàm xử lý bắt đầu kéo slot
  const handleSlotDragStart = (e: React.MouseEvent, slotId: string) => {
    if (!isEditLayoutMode) return

    e.stopPropagation()
    e.preventDefault()

    setIsSlotDragging(true)
    setDraggedSlotId(slotId)

    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    // Lấy kích thước thực tế của frame
    const frameElement = frameRef.current
    if (!frameElement) return

    const frameRect = frameElement.getBoundingClientRect()

    // Tính toán vị trí tương đối của frame so với container
    const frameX = frameRect.left - containerRect.left
    const frameY = frameRect.top - containerRect.top

    // Tìm slot trong layout
    const slot = customLayout.find((s) => s.id === slotId)
    if (!slot) return

    // Tính toán vị trí tương đối của slot trong frame
    const slotX = (slot.x / 100) * frameRect.width
    const slotY = (slot.y / 100) * frameRect.height

    // Tính toán offset của chuột so với góc trên bên trái của slot
    setSlotDragStart({
      x: e.clientX - containerRect.left - frameX - slotX,
      y: e.clientY - containerRect.top - frameY - slotY,
    })
  }

  // Thay thế hàm handleSlotDrag hiện tại bằng hàm sau:
  const handleSlotDrag = (e: React.MouseEvent) => {
    if (!isSlotDragging || !draggedSlotId) return

    e.preventDefault()
    e.stopPropagation()

    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    const slotIndex = customLayout.findIndex((slot) => slot.id === draggedSlotId)
    if (slotIndex === -1) return

    const slot = customLayout[slotIndex]

    // Lấy kích thước thực tế của frame
    const frameElement = frameRef.current
    if (!frameElement) return

    const frameRect = frameElement.getBoundingClientRect()

    // Tính toán vị trí chuột tương đối so với container
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    // Tính toán vị trí tương đối so với frame
    const frameX = frameRect.left - containerRect.left
    const frameY = frameRect.top - containerRect.top
    const frameWidth = frameRect.width
    const frameHeight = frameRect.height

    // Tính toán vị trí mới của slot dựa trên tọa độ chuột và offset ban đầu
    const newX = ((mouseX - frameX - slotDragStart.x) / frameWidth) * 100
    const newY = ((mouseY - frameY - slotDragStart.y) / frameHeight) * 100

    // Giới hạn vị trí trong frame
    const clampedX = Math.max(0, Math.min(100 - slot.width, newX))
    const clampedY = Math.max(0, Math.min(100 - slot.height, newY))

    // Cập nhật layout
    const updatedLayout = [...customLayout]
    updatedLayout[slotIndex] = {
      ...slot,
      x: clampedX,
      y: clampedY,
      customPosition: true,
    }

    setCustomLayout(updatedLayout)

    // Log để debug
    if (debugMode) {
      console.log(
        `Slot ${draggedSlotId} moved to: x=${clampedX.toFixed(2)}, y=${clampedY.toFixed(2)} (relative to frame)`,
      )
    }
  }

  // Thay thế hàm handleSlotResizeStart hiện tại bằng hàm sau:
  const handleSlotResizeStart = (e: React.MouseEvent, slotId: string, direction: string) => {
    if (!isEditLayoutMode) return

    e.preventDefault()
    e.stopPropagation()

    setIsResizing(true)
    setResizeSlotId(slotId)
    setResizeDirection(direction)

    // Lưu vị trí chuột khi bắt đầu resize
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
    })

    // Lưu trạng thái ban đầu của slot
    const slot = customLayout.find((s) => s.id === slotId)
    if (slot) {
      setInitialImageState({
        scale: 1,
        position: {
          x: slot.x,
          y: slot.y,
        },
      })
    }

    // Log để debug
    if (debugMode) {
      console.log(`Started resizing slot ${slotId} in direction ${direction}`)
    }
  }

  // Thay thế hàm handleSlotResize hiện tại bằng hàm sau:
  const handleSlotResize = (e: React.MouseEvent) => {
    if (!isResizing || !resizeSlotId || !resizeDirection || !initialImageState) return

    e.preventDefault()
    e.stopPropagation()

    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return

    const slotIndex = customLayout.findIndex((slot) => slot.id === resizeSlotId)
    if (slotIndex === -1) return

    const slot = customLayout[slotIndex]

    // Lấy kích thước thực tế của frame
    const frameElement = frameRef.current
    if (!frameElement) return

    const frameRect = frameElement.getBoundingClientRect()

    // Tính toán vị trí chuột tương đối so với container
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    // Tính toán vị trí tương đối so với frame
    const frameX = frameRect.left - containerRect.left
    const frameY = frameRect.top - containerRect.top
    const frameWidth = frameRect.width
    const frameHeight = frameRect.height

    // Tính toán vị trí chuột trong tọa độ phần trăm của frame
    const relativeX = ((mouseX - frameX) / frameWidth) * 100
    const relativeY = ((mouseY - frameY) / frameHeight) * 100

    let newX = slot.x
    let newY = slot.y
    let newWidth = slot.width
    let newHeight = slot.height

    // Xử lý resize theo hướng - theo sát vị trí chuột
    if (resizeDirection === "nw") {
      // Góc trên bên trái
      newX = Math.max(0, Math.min(slot.x + slot.width - 10, relativeX))
      newY = Math.max(0, Math.min(slot.y + slot.height - 10, relativeY))
      newWidth = slot.x + slot.width - newX
      newHeight = slot.y + slot.height - newY
    } else if (resizeDirection === "ne") {
      // Góc trên bên phải
      newY = Math.max(0, Math.min(slot.y + slot.height - 10, relativeY))
      newWidth = Math.max(10, Math.min(100 - slot.x, relativeX - slot.x))
      newHeight = Math.max(10, Math.min(100 - slot.y, relativeY - slot.y))
    } else if (resizeDirection === "sw") {
      // Góc dưới bên trái
      newX = Math.max(0, Math.min(slot.x + slot.width - 10, relativeX))
      newWidth = slot.x + slot.width - newX
      newHeight = Math.max(10, Math.min(100 - slot.y, relativeY - slot.y))
    } else if (resizeDirection === "se") {
      // Góc dưới bên phải
      newWidth = Math.max(10, Math.min(100 - slot.x, relativeX - slot.x))
      newHeight = Math.max(10, Math.min(100 - slot.y, relativeY - slot.y))
    }

    // Cập nhật layout
    const updatedLayout = [...customLayout]
    updatedLayout[slotIndex] = {
      ...slot,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      customPosition: true,
    }

    setCustomLayout(updatedLayout)

    // Log để debug
    if (debugMode) {
      console.log(
        `Resized slot ${resizeSlotId}: x=${newX.toFixed(2)}, y=${newY.toFixed(2)}, w=${newWidth.toFixed(2)}, h=${newHeight.toFixed(2)} (relative to frame)`,
      )
    }
  }

  // Hàm tạo slot mới
  const handleAddNewSlot = () => {
    if (!selectedTemplate) return

    // Tạo ID mới cho slot
    const newSlotId = `slot-${Date.now()}`

    // Tạo slot mới với vị trí mặc định
    const newSlot: TemplateLayout = {
      id: newSlotId,
      x: 10, // Vị trí mặc định
      y: 10,
      width: 30, // Kích thước mặc định
      height: 30,
      customPosition: true,
    }

    // Thêm slot mới vào layout
    setCustomLayout([...customLayout, newSlot])

    // Chọn slot mới để chỉnh sửa
    setActiveSlot(newSlotId)

    toast({
      title: "Đã thêm slot mới",
      description: "Bạn có thể kéo và thay đổi kích thước slot mới.",
    })
  }

  // Hàm xóa slot
  const handleDeleteSlot = (slotId: string) => {
    // Kiểm tra xem có ảnh nào đang sử dụng slot này không
    const imageInSlot = uploadedImages.find((img) => img.slotId === slotId)
    if (imageInSlot) {
      // Gỡ bỏ ảnh khỏi slot trước khi xóa slot
      setUploadedImages((images) =>
        images.map((img) => {
          if (img.slotId === slotId) {
            return {
              ...img,
              slotId: null,
              slotPosition: undefined,
            }
          }
          return img
        }),
      )
    }

    // Xóa slot khỏi layout
    setCustomLayout((layout) => layout.filter((slot) => slot.id !== slotId))

    // Nếu slot đang được chọn, bỏ chọn
    if (activeSlot === slotId) {
      setActiveSlot(null)
      setActiveImage(null)
    }

    setSelectedSlotForDelete(null)

    toast({
      title: "Đã xóa slot",
      description: "Slot đã được xóa khỏi layout.",
    })
  }

  // Hàm lưu layout vào database
  const handleSaveLayout = async () => {
    if (!selectedTemplate || !customLayout.length) return

    setIsSavingLayout(true)

    try {
      // Gọi API để lưu layout mà không cần gửi token
      // Token sẽ được lấy từ cookie ở phía server
      const response = await fetch("/api/admin/templates/save-layout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          layout: customLayout,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Lưu thành công",
          description: "Layout đã được lưu vào database.",
        })

        // Cập nhật layout gốc
        setOriginalLayout([...customLayout])
      } else {
        toast({
          title: "Lỗi lưu layout",
          description: data.error || "Đã xảy ra lỗi khi lưu layout.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving layout:", error)
      toast({
        title: "Lỗi lưu layout",
        description: "Đã xảy ra lỗi khi lưu layout.",
        variant: "destructive",
      })
    } finally {
      setIsSavingLayout(false)
    }
  }

  // Tìm hàm handleImageSelect và thay thế bằng phiên bản mới
  // Xóa đoạn code xóa ảnh khỏi slot cũ

  // Thay thế hàm handleImageSelect hiện tại bằng hàm sau:
  const handleImageSelect = (image: UploadedImage) => {
    if (!activeSlot) return

    // Xác định ID gốc của ảnh (loại bỏ phần "-copy-" nếu là bản sao)
    const originalId = image.id.includes("-copy-") ? image.id.split("-copy-")[0] : image.id

    // Tìm ảnh gốc
    const originalImage = uploadedImages.find((img) => img.id === originalId) || image

    // Cập nhật các ảnh trong state - đầu tiên gỡ bỏ ảnh khỏi slot hiện tại
    setUploadedImages((images) =>
      images.map((img) => {
        // Nếu ảnh đang được gán cho slot này, gỡ bỏ nó
        if (img.slotId === activeSlot) {
          return {
            ...img,
            slotId: null,
            slotPosition: undefined,
          }
        }
        return img
      }),
    )

    // Sau khi gỡ bỏ ảnh cũ khỏi slot, thêm ảnh mới hoặc tìm/tạo bản sao
    setUploadedImages((prevImages) => {
      // Kiểm tra xem ảnh đã được sử dụng trong slot khác chưa
      const isImageUsedInAnySlot = prevImages.some(
        (img) =>
          (img.id === image.id || (img.id.startsWith(originalId) && img.id.includes("-copy-"))) &&
          img.slotId !== null &&
          img.slotId !== activeSlot,
      )

      // Nếu ảnh chưa được sử dụng ở đâu, gán trực tiếp cho slot hiện tại
      if (!isImageUsedInAnySlot) {
        return prevImages.map((img) => {
          if (img.id === image.id) {
            const slotPosition = customLayout.findIndex((slot) => slot.id === activeSlot)
            return {
              ...img,
              slotId: activeSlot,
              slotPosition: slotPosition !== -1 ? slotPosition : undefined,
            }
          }
          return img
        })
      }

      // Tìm một bản sao chưa được sử dụng
      const unusedCopy = prevImages.find(
        (img) => img.id.startsWith(originalId) && img.id.includes("-copy-") && img.slotId === null,
      )

      if (unusedCopy) {
        // Nếu có bản sao chưa sử dụng, dùng nó
        const slotPosition = customLayout.findIndex((slot) => slot.id === activeSlot)
        return prevImages.map((img) => {
          if (img.id === unusedCopy.id) {
            return {
              ...img,
              slotId: activeSlot,
              slotPosition: slotPosition !== -1 ? slotPosition : undefined,
            }
          }
          return img
        })
      } else {
        // Nếu không có bản sao nào chưa sử dụng, tạo bản sao mới từ ảnh gốc
        const slotPosition = customLayout.findIndex((slot) => slot.id === activeSlot)
        const newImage = {
          ...originalImage,
          id: `${originalId}-copy-${Date.now()}`,
          slotId: activeSlot,
          slotPosition: slotPosition !== -1 ? slotPosition : undefined,
        }
        return [...prevImages, newImage]
      }
    })

    // Cập nhật ảnh đang hoạt động
    setTimeout(() => {
      setUploadedImages((currentImages) => {
        const imageInSlot = currentImages.find((img) => img.slotId === activeSlot)
        if (imageInSlot) {
          setActiveImage(imageInSlot)
        }
        return currentImages
      })
    }, 0)
  }

  // Handle image zoom
  const handleZoom = (value: number[]) => {
    if (!activeImage) return

    setUploadedImages((images) =>
      images.map((img) => {
        if (img.id === activeImage.id) {
          return {
            ...img,
            scale: value[0],
          }
        }
        return img
      }),
    )

    setActiveImage({
      ...activeImage,
      scale: value[0],
    })
  }

  // Handle image rotation with slider (0-360 degrees)
  const handleRotateSlider = (value: number[]) => {
    if (!activeImage) return

    setUploadedImages((images) =>
      images.map((img) => {
        if (img.id === activeImage.id) {
          return {
            ...img,
            rotation: value[0],
          }
        }
        return img
      }),
    )

    setActiveImage({
      ...activeImage,
      rotation: value[0],
    })
  }

  // Handle position X adjustment with slider
  const handlePositionXSlider = (value: number[]) => {
    if (!activeImage) return

    setUploadedImages((images) =>
      images.map((img) => {
        if (img.id === activeImage.id) {
          return {
            ...img,
            position: {
              ...img.position,
              x: value[0],
            },
          }
        }
        return img
      }),
    )

    setActiveImage({
      ...activeImage,
      position: {
        ...activeImage.position,
        x: value[0],
      },
    })
  }

  // Handle position Y adjustment with slider
  const handlePositionYSlider = (value: number[]) => {
    if (!activeImage) return

    setUploadedImages((images) =>
      images.map((img) => {
        if (img.id === activeImage.id) {
          return {
            ...img,
            position: {
              ...img.position,
              y: value[0],
            },
          }
        }
        return img
      }),
    )

    setActiveImage({
      ...activeImage,
      position: {
        ...activeImage.position,
        y: value[0],
      },
    })
  }

  // Handle mouse down for dragging image within slot
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeImage) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })

    // Prevent event propagation to avoid triggering canvas drag
    e.stopPropagation()
  }

  // Handle mouse move for dragging image within slot
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !activeImage) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })

    setUploadedImages((images) =>
      images.map((img) => {
        if (img.id === activeImage.id) {
          return {
            ...img,
            position: {
              x: img.position.x + dx / canvasZoom, // Adjust for canvas zoom
              y: img.position.y + dy / canvasZoom, // Adjust for canvas zoom
            },
          }
        }
        return img
      }),
    )

    setActiveImage({
      ...activeImage,
      position: {
        x: activeImage.position.x + dx / canvasZoom, // Adjust for canvas zoom
        y: activeImage.position.y + dy / canvasZoom, // Adjust for canvas zoom
      },
    })

    // Prevent default to avoid text selection during drag
    e.preventDefault()
  }

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, direction: string) => {
    if (!activeImage) return

    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
    })
    setInitialImageState({
      scale: activeImage.scale,
      position: { ...activeImage.position },
    })
  }

  // Handle resize move
  const handleResizeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing || !activeImage || !initialImageState || !resizeDirection) return

    e.preventDefault()
    e.stopPropagation()

    const dx = (e.clientX - resizeStart.x) / canvasZoom / 100
    const dy = (e.clientY - resizeStart.y) / canvasZoom / 100

    let newScale = initialImageState.scale
    const newPosition = { ...initialImageState.position }

    // Calculate new scale and position based on resize direction
    if (resizeDirection.includes("n")) {
      newScale = Math.max(0.1, initialImageState.scale - dy)
      newPosition.y = initialImageState.position.y + dy * 100
    }
    if (resizeDirection.includes("s")) {
      newScale = Math.max(0.1, initialImageState.scale + dy)
    }
    if (resizeDirection.includes("w")) {
      newScale = Math.max(0.1, initialImageState.scale - dx)
      newPosition.x = initialImageState.position.x + dx * 100
    }
    if (resizeDirection.includes("e")) {
      newScale = Math.max(0.1, initialImageState.scale + dx)
    }

    // Update the active image
    setUploadedImages((images) =>
      images.map((img) => {
        if (img.id === activeImage.id) {
          return {
            ...img,
            scale: newScale,
            position: newPosition,
          }
        }
        return img
      }),
    )

    setActiveImage({
      ...activeImage,
      scale: newScale,
      position: newPosition,
    })
  }

  // Handle mouse up to stop dragging and resizing
  const handleMouseUp = () => {
    setIsDragging(false)
    setIsCanvasDragging(false)
    setIsSlotDragging(false)
    setIsResizing(false)
    setDraggedSlotId(null)
    setResizeSlotId(null)
    setResizeDirection(null)
    setInitialImageState(null)
  }

  // Functions for canvas zoom and pan
  const handleCanvasZoomIn = () => {
    setCanvasZoom((prev) => Math.min(prev + 0.1, 3))
  }

  const handleCanvasZoomOut = () => {
    setCanvasZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

  // New function for wheel zoom with Ctrl key
  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    // Check if Ctrl key is pressed
    if (e.ctrlKey) {
      e.preventDefault()

      // Determine zoom direction
      if (e.deltaY < 0) {
        // Zoom in
        setCanvasZoom((prev) => Math.min(prev + 0.05, 3))
      } else {
        // Zoom out
        setCanvasZoom((prev) => Math.max(prev - 0.05, 0.5))
      }
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only start canvas dragging if we're not dragging an image or slot
    if (!isDragging && !isSlotDragging && !isResizing) {
      setIsCanvasDragging(true)
      setCanvasDragStart({
        x: e.clientX,
        y: e.clientY,
      })
    }
  }

  // Cập nhật hàm handleCanvasMouseMove
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCanvasDragging) {
      const dx = e.clientX - canvasDragStart.x
      const dy = e.clientY - canvasDragStart.y

      setCanvasDragStart({
        x: e.clientX,
        y: e.clientY,
      })

      setCanvasPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }))

      e.preventDefault()
    } else if (isSlotDragging && draggedSlotId) {
      handleSlotDrag(e)
    } else if (isResizing && resizeSlotId) {
      handleSlotResize(e)
    } else if (isDragging && activeImage) {
      handleMouseMove(e)
    }
  }

  const handleResetCanvasView = () => {
    setCanvasZoom(1)
    setCanvasPosition({ x: 0, y: 0 })
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Hàm điều chỉnh vị trí và kích thước của các slot khi frame thay đổi kích thước
  const adjustSlotsToFrameSize = (newWidth: number, newHeight: number) => {
    if (!selectedTemplate || originalLayout.length === 0) return

    // Sử dụng standardFrameSize nếu newWidth hoặc newHeight là 0
    const effectiveWidth = newWidth > 0 ? newWidth : standardFrameSize.width
    const effectiveHeight = newHeight > 0 ? newHeight : standardFrameSize.height

    const frameImageAspectRatio = templateImageSize.width / templateImageSize.height || 1.500375
    let frameImageWidth = 0
    let frameImageHeight = 0

    const canvasAspectRatio = effectiveWidth / effectiveHeight
    if (debugMode) {
      console.log(`Canvas aspect ratio: ${canvasAspectRatio}`)
      console.log(`New canvas size: ${effectiveWidth}x${effectiveHeight}`)
    }

    if (frameImageAspectRatio > canvasAspectRatio) {
      frameImageWidth = effectiveWidth
      frameImageHeight = effectiveWidth / frameImageAspectRatio
    } else {
      frameImageHeight = effectiveHeight
      frameImageWidth = effectiveHeight * frameImageAspectRatio
    }

    setCanvasFrameSize({
      width: `${frameImageWidth}px`,
      height: `${frameImageHeight}px`,
    })
    console.log(`Frame image size in canvas: ${frameImageWidth}x${frameImageHeight}`)

    let oldFrameImageWidth = 0
    let oldFrameImageHeight = 0

    // Get standard ratio
    const standardAspectRatio = standardFrameSize.width / standardFrameSize.height

    if (frameImageAspectRatio > standardAspectRatio) {
      // Ảnh ngang → fit theo chiều rộng canvas
      oldFrameImageWidth = standardFrameSize.width
      oldFrameImageHeight = standardFrameSize.width / frameImageAspectRatio
    } else {
      // Ảnh dọc hoặc vuông → fit theo chiều cao canvas
      oldFrameImageHeight = standardFrameSize.height
      oldFrameImageWidth = standardFrameSize.height * frameImageAspectRatio
    }

    // Lấy kích thước canvas ban đầu (sử dụng standardFrameSize hoặc initialFrameRect)
    const W_old = standardFrameSize.width // 951 theo ví dụ
    const H_canvas = newHeight // Chiều cao canvas hiện tại

    // Tính toán lề trái cũ và mới
    const leftMargin_old = (W_old - oldFrameImageWidth) / 2
    const leftMargin_new = (newWidth - frameImageWidth) / 2

    // const frameImageHeight = newWidth / frameImageAspectRatio // Chiều cao ảnh trong canvas
    const topMargin_old = (standardFrameSize.height - oldFrameImageHeight) / 2
    const topMargin_new = (newHeight - frameImageHeight) / 2


    if (debugMode) {
      console.log(`Frame size changed: ${newWidth}x${newHeight}`)
      console.log(`Frame image aspect ratio: ${frameImageAspectRatio}`)
      console.log(`Frame image width in canvas: ${frameImageWidth}`)
      console.log(`Left margin old: ${leftMargin_old}, Left margin new: ${leftMargin_new}`)
    }

    // Điều chỉnh layout dựa trên layout gốc và công thức tổng quát
    setCustomLayout(
      originalLayout.map((slot) => {
        // Tính toán vị trí x và width theo pixel dựa trên phần trăm cũ
        const x_old_pixel = (slot.x * W_old) / 100
        const width_pixel = (slot.width * W_old) / 100

        // Tính toán độ lệch x so với lề trái
        const deltaX = x_old_pixel - leftMargin_old

        // Tính toán vị trí x mới theo pixel
        const x_new_pixel = leftMargin_new + deltaX

        // Chuyển đổi vị trí x mới về phần trăm
        const x_new_percent = (x_new_pixel / newWidth) * 100

        // Tính toán width mới theo phần trăm
        const width_new_percent = (width_pixel / newWidth) * 100

        const y_old_pixel = (slot.y * standardFrameSize.height) / 100
        const height_pixel = (slot.height * standardFrameSize.height) / 100

        const deltaY = y_old_pixel - topMargin_old
        const y_new_pixel = topMargin_new + deltaY

        const y_new_percent = (y_new_pixel / newHeight) * 100
        const height_new_percent = (height_pixel / newHeight) * 100


        // Giữ nguyên vị trí y và height vì chiều cao không thay đổi
        return {
          ...slot,
          // x: x_new_percent,
          // width: width_new_percent,
          // y: y_new_percent,
          // height: height_new_percent,
        }
      }),
    )
  }

  // Cập nhật kích thước khung ảnh khi template thay đổi
  useEffect(() => {
    if (!selectedTemplate) return;

    const updateFrameRect = () => {
      const frameElement = frameRef.current;
      const containerElement = containerRef.current;

      if (!frameElement || !containerElement) {
        if (debugMode) {
          console.log("FrameRef or ContainerRef not ready yet");
        }
        // Thử lại sau một khoảng thời gian ngắn
        setTimeout(updateFrameRect, 100);
        return;
      }

      // Tải ảnh khung để đảm bảo nó đã sẵn sàng
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedTemplate.frameImage;

      const onImageLoad = () => {
        const rect = frameElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          const newFrameRect = {
            width: rect.width,
            height: rect.height,
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
          };

          setFrameRect(newFrameRect);

          if (initialFrameRect.width === 0) {
            setInitialFrameRect({
              width: rect.width,
              height: rect.height,
            });
            setOriginalLayout([...selectedTemplate.layout]);
          }

          if (debugMode) {
            console.log(`Updated frameRect: ${newFrameRect.width}x${newFrameRect.height}`);
          }
        } else {
          console.warn("Frame element has zero dimensions:", rect);
          // Fallback to standardFrameSize
          setFrameRect({
            width: standardFrameSize.width,
            height: standardFrameSize.height,
            x: 0,
            y: 0,
          });
          if (initialFrameRect.width === 0) {
            setInitialFrameRect({
              width: standardFrameSize.width,
              height: standardFrameSize.height,
            });
          }
        }
      };

      img.onload = onImageLoad;
      img.onerror = () => {
        console.error("Failed to load frame image:", selectedTemplate.frameImage);
        // Fallback to standardFrameSize
        setFrameRect({
          width: standardFrameSize.width,
          height: standardFrameSize.height,
          x: 0,
          y: 0,
        });
        if (initialFrameRect.width === 0) {
          setInitialFrameRect({
            width: standardFrameSize.width,
            height: standardFrameSize.height,
          });
        }
      };

      // Kiểm tra xem ảnh đã tải chưa
      if (frameElement.complete && frameElement.naturalWidth > 0) {
        // Ảnh đã tải sẵn, gọi ngay onImageLoad
        onImageLoad();
      }
    };

    // Chạy lần đầu
    updateFrameRect();

    // Thêm event listener cho resize
    window.addEventListener("resize", updateFrameRect);

    return () => {
      window.removeEventListener("resize", updateFrameRect);
    };
  }, [selectedTemplate, debugMode, initialFrameRect.width, standardFrameSize]);

  useEffect(() => {
    if (templateImageSize.width > 0 && templateImageSize.height > 0) {
      // Chỉ chạy khi đã có kích thước thực tế
      // debugger
      console.log(`Adjusting slots to frame size: ${templateImageSize.width}x${templateImageSize.height}`)
      console.log(`Current frame size: ${frameRect.width}x${frameRect.height}`)
      console.log(`Current frame size 2: ${initialFrameRect.width}x${initialFrameRect.height}`)
      adjustSlotsToFrameSize(frameRect.width, frameRect.height) // Truyền vào kích thước canvas hiện tại
    }
  }, [templateImageSize]) // Theo dõi khi giá trị này thay đổi

  useEffect(() => {
    if (templateImageSize.width > 0 && templateImageSize.height > 0) {
      // Chỉ chạy khi đã có kích thước thực tế
      // debugger
      console.log(`Adjusting slots to frame size: ${templateImageSize.width}x${templateImageSize.height}`)
      console.log(`Current frame size: ${frameRect.width}x${frameRect.height}`)
      console.log(`Current frame size 2: ${initialFrameRect.width}x${initialFrameRect.height}`)
      adjustSlotsToFrameSize(frameRect.width, frameRect.height) // Truyền vào kích thước canvas hiện tại
    }
  }, [frameRect]) // Theo dõi khi giá trị này thay đổi


  // Generate preview image
  const generatePreview = async () => {
    if (!selectedTemplate) return

    setIsGeneratingPreview(true)

    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Initialize aspect ratio and max dimension
      let aspectRatio = originalAspectRatio || 1
      let maxDimension = 1200

      // Load template image to get accurate dimensions
      await new Promise<void>((resolve) => {
        const frameImg = new Image()
        frameImg.crossOrigin = "anonymous"
        frameImg.onload = () => {
          aspectRatio = frameImg.width / frameImg.height
          maxDimension = Math.max(frameImg.width, frameImg.height)
          if (debugMode) {
            console.log(`Preview: Frame image loaded with aspect ratio: ${aspectRatio}`)
          }
          resolve()
        }
        frameImg.onerror = () => {
          console.error("Failed to load frame:", selectedTemplate.frameImage)
          resolve()
        }
        frameImg.src = selectedTemplate.frameImage
      })

      // Set canvas size based on aspect ratio
      let previewCanvasWidth, previewCanvasHeight
      if (aspectRatio >= 1) {
        previewCanvasWidth = maxDimension
        previewCanvasHeight = Math.round(maxDimension / aspectRatio)
      } else {
        previewCanvasHeight = maxDimension
        previewCanvasWidth = Math.round(maxDimension * aspectRatio)
      }

      canvas.width = previewCanvasWidth
      canvas.height = previewCanvasHeight

      // Clear canvas and set background
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw slot images
      await Promise.all(
        customLayout.map(async (slot) => {
          const image = uploadedImages.find((img) => img.slotId === slot.id)
          if (!image) return

          return new Promise<void>((resolve) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              // Calculate slot position and size directly from percentages
              const dx = (slot.x / 100) * previewCanvasWidth
              const dy = (slot.y / 100) * previewCanvasHeight
              const dw = (slot.width / 100) * previewCanvasWidth
              const dh = (slot.height / 100) * previewCanvasHeight

              if (debugMode) {
                console.log(
                  `Preview: Slot ${slot.id} - Preview pixels: dx=${dx.toFixed(2)}, dy=${dy.toFixed(
                    2,
                  )}, dw=${dw.toFixed(2)}, dh=${dh.toFixed(2)}`,
                )
              }

              // Create clipping path
              ctx.save()
              ctx.beginPath()
              ctx.rect(dx, dy, dw, dh)
              ctx.clip()

              // Calculate center position of the slot
              const slotCenterX = dx + dw / 2
              const slotCenterY = dy + dh / 2

              // Calculate image dimensions
              const imgAspectRatio = img.width / img.height
              let baseWidth, baseHeight

              if (dw / dh > imgAspectRatio) {
                // Slot is wider than image -> fit by height
                baseHeight = dh
                baseWidth = dh * imgAspectRatio
              } else {
                // Slot is taller than image -> fit by width
                baseWidth = dw
                baseHeight = dw / imgAspectRatio
              }

              // Apply user's scale
              const imgWidth = baseWidth * image.scale
              const imgHeight = baseHeight * image.scale

              // Calculate offset based on editor's pixel offsets
              // In the editor, position.x and position.y are in pixels relative to the slot's center
              // Scale these offsets to match the preview canvas
              const editorSlotWidth = (slot.width / 100) * frameRect.width
              const editorSlotHeight = (slot.height / 100) * frameRect.height
              const scaleFactorX = dw / editorSlotWidth
              const scaleFactorY = dh / editorSlotHeight
              const offsetX = image.position.x * scaleFactorX
              const offsetY = image.position.y * scaleFactorY

              if (debugMode) {
                console.log(
                  `Preview: Image ${image.id} - Editor offsets: x=${image.position.x}, y=${image.position.y}`,
                )
                console.log(`Preview: Scale factors: x=${scaleFactorX.toFixed(2)}, y=${scaleFactorY.toFixed(2)}`)
                console.log(`Preview: Applied offsets: x=${offsetX.toFixed(2)}, y=${offsetY.toFixed(2)}`)
              }

              // Draw image with rotation
              ctx.save()
              ctx.translate(slotCenterX, slotCenterY)
              ctx.rotate((image.rotation * Math.PI) / 180)
              ctx.drawImage(img, -imgWidth / 2 + offsetX, -imgHeight / 2 + offsetY, imgWidth, imgHeight)
              ctx.restore()

              ctx.restore()
              resolve()
            }
            img.onerror = () => {
              console.error("Failed to load image:", image.url)
              resolve()
            }
            img.src = image.url
          })
        }),
      )

      // Draw frame on top
      await new Promise<void>((resolve) => {
        const frameImg = new Image()
        frameImg.crossOrigin = "anonymous"
        frameImg.onload = () => {
          ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)
          resolve()
        }
        frameImg.onerror = () => {
          console.error("Failed to load frame:", selectedTemplate.frameImage)
          resolve()
        }
        frameImg.src = selectedTemplate.frameImage
      })

      // Save official URL (no watermark)
      const dataOfficialUrl = canvas.toDataURL("image/jpeg", 1)
      // Sau đó thêm watermark chỉ cho phiên bản tải xuống
      // Draw watermark phủ đều toàn bộ ảnh, tự động scale theo kích thước canvas
      const watermarkText = "Tulie Photolab Demo"
      // Tính toán kích thước font dựa trên chiều rộng canvas
      // const fontSize = Math.max(24, Math.floor(canvas.width / 33))
      // debugger
      const fontSize = 120
      ctx.font = `${fontSize}px Arial`
      ctx.fillStyle = "rgba(200, 200, 200, 0.38)"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      // Đo kích thước text
      const textMetrics = ctx.measureText(watermarkText)
      const textWidth = textMetrics.width
      const textHeight = fontSize

      // Tính khoảng cách giữa các watermark để phủ đều
      const stepX = textWidth * 1.5
      const stepY = textHeight * 3

      // Vẽ watermark theo đường chéo phủ đều toàn bộ canvas
      for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
        for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(-Math.PI / 6)
          // ctx.fillText(watermarkText, 0, 0)
          ctx.restore()
        }
      }
      ctx.font = "30px Arial"
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      ctx.fillText("Tulie Photolab Preview", 20, canvas.height - 20)

      // Save preview URL (with watermark)
      const dataPreviewUrl = canvas.toDataURL("image/jpeg", 0.1)
      setOfficialUrl(dataOfficialUrl)
      setPreviewUrl(dataPreviewUrl)
      setActiveTab("preview")
    } catch (error) {
      console.error("Error generating preview:", error)
      toast({
        title: "Lỗi tạo bản xem trước",
        description: "Đã xảy ra lỗi khi tạo bản xem trước",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // Handle download preview
  const handleDownloadPreview = () => {
    if (!previewUrl) return

    const link = document.createElement("a")
    link.href = previewUrl
    link.download = `photolab-preview-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Trong phần renderPreview, thêm đoạn code sau để hiển thị các tùy chọn giá
  const [selectedPriceOption, setSelectedPriceOption] = useState<string>("download")

  // Tạo các tùy chọn giá từ template ã chọn
  const getPriceOptions = (template: Template): PriceOption[] => {
    return [
      {
        type: "download",
        label: "Tải ảnh (file kỹ thuật số)",
        original_price: template.download_price,
        sale_price: template.download_sale_price,
      },
      {
        type: "print",
        label: "In ảnh (bản in vật lý)",
        original_price: template.print_price,
        sale_price: template.print_sale_price,
      },
    ]
  }

  const handleBoothPrint = async () => {
    const imageSrc = officialUrl ?? previewUrl
    if (!imageSrc) {
      toast({
        title: "Chưa có ảnh",
        description: "Hãy tạo xem trước trước khi in.",
        variant: "destructive",
      })
      return
    }

    setIsPrinting(true)
    try {
      // Upload ảnh đã ghép lên Cloudinary để tạo link QR (tránh data URL quá dài)
      let mergedCloudUrl: string | null = null
      try {
        if (officialUrl?.startsWith("data:")) {
          const file = await dataUrlToFile(officialUrl, `merged-${sectionId}.jpg`)
          const stored = await uploadImage(file, sectionId)
          mergedCloudUrl = stored.url
        } else if (officialUrl?.startsWith("http")) {
          mergedCloudUrl = officialUrl
        } else if (previewUrl?.startsWith("http")) {
          mergedCloudUrl = previewUrl
        }
      } catch (e) {
        console.error("Upload merged image for finish QR failed:", e)
      }

      const hasPrintService = Boolean(process.env.NEXT_PUBLIC_BOOTH_PRINT_URL?.trim())
      if (hasPrintService) {
        await postImageToBoothPrintService(imageSrc)
        toast({
          title: "Đã gửi lệnh in",
          description: "Ảnh đã được gửi tới máy in.",
        })
        router.push(
          mergedCloudUrl
            ? `/finish?img=${encodeURIComponent(mergedCloudUrl)}&code=${encodeURIComponent(sectionId)}`
            : `/finish?code=${encodeURIComponent(sectionId)}`,
        )
        return
      }
      await printImageInBrowser(imageSrc)
      toast({
        title: "In ảnh",
        description: "Chọn máy in trong hộp thoại để hoàn tất.",
      })
      router.push(
        mergedCloudUrl
          ? `/finish?img=${encodeURIComponent(mergedCloudUrl)}&code=${encodeURIComponent(sectionId)}`
          : `/finish?code=${encodeURIComponent(sectionId)}`,
      )
    } catch (err) {
      console.error("Booth print:", err)
      try {
        await printImageInBrowser(imageSrc)
        toast({
          title: "In qua trình duyệt",
          description:
            process.env.NEXT_PUBLIC_BOOTH_PRINT_URL?.trim()
              ? "Dịch vụ in không phản hồi; đã mở hộp thoại in."
              : "Chọn máy in để in ảnh.",
        })
        router.push(`/finish?code=${encodeURIComponent(sectionId)}`)
      } catch (e2) {
        toast({
          title: "Không in được",
          description: (e2 as Error).message,
          variant: "destructive",
        })
      }
    } finally {
      setIsPrinting(false)
    }
  }

  const allSlotsHaveImages = () => {
    if (!selectedTemplate) return false

    return customLayout.every((slot) => {
      return uploadedImages.some((img) => img.slotId === slot.id)
    })
  }

  // Format price function
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Hàm xử lý sao chép link template
  const handleCopyTemplateLink = (templateId: string) => {
    try {
      const link = getShareableLink(templateId)
      navigator.clipboard.writeText(link)

      // Hiển thị thông báo
      setCopyMessage("Đã sao chép đường link của template")
      setShowCopyNotification(true)

      // Log để debug
      console.log("Link copied:", link)
      console.log("Notification shown")
    } catch (error) {
      console.error("Error copying link:", error)
      setCopyMessage("Không thể sao chép đường link")
      setShowCopyNotification(true)
    }
  }

  // Thêm hàm xử lý khi click vào icon swap
  // Thêm sau các hàm xử lý khác, trước return
  const handleSwapImage = (slotId: string) => {
    // Chọn slot
    setActiveSlot(slotId)

    // Tìm ảnh trong slot
    const imageInSlot = uploadedImages.find((img) => img.slotId === slotId)
    if (imageInSlot) {
      setActiveImage(imageInSlot)
    }

    // Mở rộng khu vực "Tải ảnh lên"
    setIsExpandedImageList(true)
    setIsUploadAreaCollapsed(false)
  }

  const renderTemplateSelector = () => {
    // Trong hàm renderTemplateSelector, thêm hiển thị loading state
    if (isLoadingTemplates) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
          <div className="md:col-span-3">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Đang tải khung ảnh...</h2>
                <div className="flex justify-center py-8">
                  {/* <LoadingSpinner size="lg" /> */}
                  <Loading />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
        <div className="md:col-span-3">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Chọn mẫu khung ảnh</h2>

              {/* Category filter */}
              <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2" ref={categoriesContainerRef}>
                <CategorySelector
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={filterTemplatesByCategory}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedTemplate?.id === template.id
                      ? "border-primary ring-2 ring-primary ring-opacity-50"
                      : "border-gray-200"
                      }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="aspect-square relative">
                      {/* <Image
                        src={template.image || "/placeholder.svg"}
                        alt={template.name}
                        className="w-full h-full object-contain"
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "contain" }}
                        priority={false}
                      /> */}

                      {/* <ImageCanvas
                        src={template.image || "/placeholder.svg"}
                        alt={template.name}
                        width={600}
                        height={400}
                      /> */}
                      <ImageCanvas
                        src={template.image || "/placeholder.svg"}
                        alt={template.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm">{template.name}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">{template.layout?.length} slots</p>
                        {(template.download_sale_price != null && template.download_sale_price != undefined) ||
                          (template.print_sale_price != null && template.print_sale_price != undefined) ? (
                          <div className="flex flex-col items-center">
                            <div className="text-xs font-medium text-primary">
                              {template.download_sale_price === 0 || template.print_sale_price === 0
                                ? "Miễn phí"
                                : formatPrice(template.download_sale_price!) +
                                " - " +
                                formatPrice(template.print_sale_price!)}
                            </div>
                            {template.download_sale_price !== 0 && template.print_sale_price !== 0 && (
                              <div className="text-xs line-through text-gray-500">
                                {formatPrice(template.download_price) + " - " + formatPrice(template.print_price)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-primary">
                            {template.download_price === 0 || template.print_price === 0
                              ? "Miễn phí"
                              : formatPrice(template.download_price) + " - " + formatPrice(template.print_price)}
                          </div>
                        )}
                      </div>
                      {/* Thêm nút chia sẻ */}
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyTemplateLink(template.id)
                          }}
                          className="text-xs text-gray-500 hover:text-primary flex items-center cursor-pointer relative group"
                          title="Lấy link của template này"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                          Chia sẻ
                          {/* <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            Lấy link của template này
                          </div> */}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Render editor
  const renderEditor = () => {
    if (!selectedTemplate || !isMounted) return null

    return (
      <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-white p-4" : ""}`}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Canvas area */}
          <div className={`${isFullscreen ? "flex-grow" : "md:w-2/3"}`}>
            <Card>
              <CardContent className="p-4">
                {/* Thêm nút chuyển đổi chế độ chỉnh sửa layout trong phần điều khiển */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Chỉnh sửa</h2>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant={isEditLayoutMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsEditLayoutMode(!isEditLayoutMode)}
                          className="mr-2"
                        >
                          {isEditLayoutMode ? "Tắt chỉnh sửa layout" : "Chỉnh sửa layout"}
                        </Button>
                        {isEditLayoutMode && (
                          <>
                            <Button variant="outline" size="sm" onClick={handleAddNewSlot} className="mr-2">
                              <PlusCircle className="h-4 w-4 mr-1" /> Thêm slot
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSaveLayout}
                              disabled={isSavingLayout}
                              className="mr-2"
                            >
                              {isSavingLayout ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-1"></div>{" "}
                                  Đang lưu...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" /> Lưu layout
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setDebugMode(!debugMode)} className="mr-2">
                          {debugMode ? "Tắt Debug" : "Bật Debug"}
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="icon" onClick={handleCanvasZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleCanvasZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleResetCanvasView}>
                      <Undo className="h-4 w-4" />
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
                  onMouseDown={(e) => {
                    if (!isDragging && !isResizing && !isSlotDragging) handleCanvasMouseDown(e)
                  }}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheelZoom}
                >
                  {/* Canvas content */}
                  <div
                    ref={canvasRef}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `translate(-50%, -50%) translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasZoom})`,
                      transformOrigin: "0 0",
                      width: `${canvasFrameSize?.width}`,
                      height: `${canvasFrameSize?.height}`,
                      position: "relative",
                    }}
                  >
                    {/* Hiển thị các slot trước (nằm dưới) */}
                    {customLayout.map((slot) => {
                      const image = uploadedImages.find((img) => img.slotId === slot.id)
                      if (canvasFrameSize?.width === "100%") return null // Trả về null nếu chưa có kích thước canvas
                      return (
                        <div
                          key={slot.id}
                          className={`absolute border-2 ${isEditLayoutMode
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
                            zIndex: isEditLayoutMode ? 20 : 1, // Khi đang trong chế độ chỉnh sửa layout, z-index cao hơn frame (10)
                            opacity: isEditLayoutMode ? 0.5 : 1,
                          }}
                          onClick={(e) => {
                            if (!isEditLayoutMode) handleSlotSelect(slot.id, e)
                          }}
                          onMouseDown={(e) => {
                            if (isEditLayoutMode) {
                              handleSlotDragStart(e, slot.id)
                            } else if (image) {
                              handleMouseDown(e)
                            }
                          }}
                          onMouseEnter={() => !isEditLayoutMode && setIsHoveringSlot(slot.id)}
                          onMouseLeave={() => setIsHoveringSlot(null)}
                        >
                          {/* Thêm icon swap khi hover vào slot */}
                          {/* Tìm đoạn code này trong phần render của các slot (khoảng dòng 1000-1050)
                          {isHoveringSlot === slot.id && image && !isEditLayoutMode && (
                            <div
                              className="absolute inset-0 flex items-center justify-center bg-opacity-30 z-30 transition-opacity duration-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSwapImage(slot.id)
                              }}
                            >
                              <div
                                className="bg-white rounded-full p-2 shadow-md cursor-pointer transition-transform hover:scale-110"
                                title="Thay đổi ảnh"
                              >
                                <Repeat className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                          )} */}
                          {isHoveringSlot === slot.id && image && !isEditLayoutMode && (
                            <div
                              className="absolute inset-0 flex items-center justify-center bg-opacity-30 z-30 transition-opacity duration-200"
                            // onClick={(e) => e.stopPropagation()} // Chỉ ngăn sự kiện lan truyền, không gọi handleSwapImage
                            >
                              <div
                                className="bg-white rounded-full p-2 shadow-md cursor-pointer transition-transform hover:scale-110"
                                title="Thay đổi ảnh"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSwapImage(slot.id)
                                }}
                              >
                                <Repeat className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                          )}
                          {image ? (
                            <div
                              className="w-full h-full overflow-hidden relative"
                              onMouseMove={(e) => {
                                if (isDragging && !isEditLayoutMode) handleMouseMove(e)
                              }}
                            >
                              <img
                                src={image.url || "/placeholder.svg"}
                                alt={`Slot ${slot.id}`}
                                className="w-full h-full object-contain"
                                style={{
                                  transform: `translate(${image.position.x}px, ${image.position.y}px) scale(${image.scale}) rotate(${image.rotation}deg)`,
                                  transformOrigin: "center",
                                }}
                                draggable={false}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 bg-opacity-50">
                              <span className={`text-sm ${activeSlot === slot.id ? "text-primary" : "text-gray-500"}`}>
                                Chọn ảnh
                              </span>
                            </div>
                          )}
                          {activeSlot === slot.id && !isEditLayoutMode && (
                            <div className="absolute inset-0 border-2 border-primary bg-primary opacity-20 pointer-events-none z-20"></div>
                          )}

                          {/* Resize handles - only show in edit layout mode */}
                          {isEditLayoutMode && (
                            <>
                              <div
                                className="absolute top-0 left-0 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                                onMouseDown={(e) => handleSlotResizeStart(e, slot.id, "nw")}
                              />
                              <div
                                className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-20"
                                onMouseDown={(e) => handleSlotResizeStart(e, slot.id, "ne")}
                              />
                              <div
                                className="absolute bottom-0 left-0 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-20"
                                onMouseDown={(e) => handleSlotResizeStart(e, slot.id, "sw")}
                              />
                              <div
                                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                                onMouseDown={(e) => handleSlotResizeStart(e, slot.id, "se")}
                              />
                            </>
                          )}
                          {isEditLayoutMode && debugMode && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                              x: {Math.round(slot.x)}, y: {Math.round(slot.y)}, w: {Math.round(slot.width)}, h:{" "}
                              {Math.round(slot.height)}
                            </div>
                          )}
                          {isEditLayoutMode && (
                            <button
                              className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity z-30"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSlot(slot.id)
                              }}
                              title="Xóa slot"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* Frame (always on top) */}
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: isEditLayoutMode ? 5 : 10 }}>
                      <img
                        ref={frameRef}
                        src={selectedTemplate?.frameImage || "/placeholder.svg"}
                        alt="Frame"
                        className="w-full h-full object-contain"
                      />
                      {debugMode && (
                        <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 z-20">
                          Frame: w={Math.round(frameRect.width)}, h={Math.round(frameRect.height)}, ratio=
                          {originalAspectRatio.toFixed(2)} → {(frameRect.width / frameRect.height).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls area */}
          <div className={`${isFullscreen ? "w-80" : "md:w-1/3"} flex flex-col gap-4 relative`}>
            {/* Tải ảnh lên section */}
            <div
              className={`md:static w-full transition-all duration-300 ${activeSlot && !activeImage
                ? "fixed bottom-0 left-0 right-0 z-20 bg-white shadow-lg md:bg-transparent md:shadow-none"
                : "relative"
                }`}
            >
              <Card className={`w-full ${isUploadAreaCollapsed ? "" : "max-h-[60vh]"} overflow-y-auto transition-all duration-300`}>
                <CardContent className={`p-4 ${isUploadAreaCollapsed ? "pb-0" : ""}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Tải ảnh lên</h2>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsUploadAreaCollapsed(!isUploadAreaCollapsed)}
                        className="h-6 px-2 text-xs"
                      >
                        {isUploadAreaCollapsed ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" /> Mở rộng
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" /> Thu gọn
                          </>
                        )}
                      </Button>
                  </div>

                  <div className={`${isUploadAreaCollapsed ? "hidden" : "block"}`}>
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
                      {/* <label htmlFor="image-upload-edit" className="cursor-pointer"> */}
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
                            {/* <p className="text-sm text-gray-500">Nhấp để tải ảnh lên</p> */}
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

                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCameraDialog(true)}
                                className="flex items-center gap-2"
                              >
                                <Camera className="h-4 w-4" />
                                Chụp ảnh ngay
                              </Button> */}
                            </div>
                            <p className="text-xs text-gray-400">PNG, JPG, GIF lên đến 10MB</p>
                          </>
                        )}
                      </div>
                      {/* </label> */}
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
                            className={`relative aspect-square border rounded-md overflow-hidden cursor-pointer group ${activeImage?.id === image.id
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

                            {/* Delete button - visible on hover */}
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

                            {/* Loading overlay when deleting */}
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tùy chỉnh section */}
            <div
              className={`md:static w-full transition-all duration-300 ${activeSlot && activeImage
                ? "fixed bottom-0 left-0 right-0 z-20 bg-white shadow-lg md:bg-transparent md:shadow-none"
                : "relative"
                }`}
            >
              <Card className={`w-full ${isCustomizeCollapsed ? "" : "max-h-[60vh]"} overflow-y-auto transition-all duration-300`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Tùy chỉnh</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCustomizeCollapsed(!isCustomizeCollapsed)}
                      className="h-6 px-2 text-xs md:hidden"
                    >
                      {isCustomizeCollapsed ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" /> Mở rộng
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" /> Thu gọn
                        </>
                      )}
                    </Button>
                  </div>

                  <div className={`${isCustomizeCollapsed ? "hidden" : "block"} md:block`}>
                    {activeSlot ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium mb-2">
                            {customLayout.findIndex((slot) => slot.id === activeSlot) > -1
                              ? `Ảnh ${customLayout.findIndex((slot) => slot.id === activeSlot) + 1}`
                              : `Ảnh`}
                          </h3>
                          {activeImage && (
                            <>
                              {/* Position X slider */}
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

                              {/* Position Y slider */}
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
                                <Slider
                                  value={[activeImage.scale]}
                                  min={0.5}
                                  max={4}
                                  step={0.01}
                                  onValueChange={handleZoom}
                                />
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
                    ) : (
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
                  </div>
                </CardContent>
              </Card>
            </div>
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
        </div>
      </div>
    )
  }

  // Trong phần renderPreview, thêm component PriceOptions
  const renderPreview = () => {
    if (!previewUrl || !selectedTemplate) return null

    const priceOptions = getPriceOptions(selectedTemplate)

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Xem trước</h2>
              <div className="flex gap-2">
                {/* <Button variant="outline" size="icon" onClick={handleDownloadPreview}>
                  <Download className="h-4 w-4" />
                </Button> */}
              </div>
            </div>

            <div className="flex justify-center relative">
              <div className="relative inline-block">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="max-w-full max-h-[600px] object-contain border rounded-lg"
                />
              </div>
            </div>

            {/* <div className="mt-6">
              <PriceOptions
                options={priceOptions}
                selectedOption={selectedPriceOption}
                onOptionChange={setSelectedPriceOption}
              />
            </div> */}

            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" onClick={() => setActiveTab("edit")}>
                Quay lại chỉnh sửa
              </Button>
              <Button onClick={handleBoothPrint} disabled={isPrinting}>
                {isPrinting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang gửi in...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" /> In ảnh
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4">Thông tin sản phẩm</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Loại khung:</span>
                <span className="font-medium">{selectedTemplate?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số lượng ảnh:</span>
                <span className="font-medium">{selectedTemplate?.slots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loại sản phẩm:</span>
                <span className="font-medium">
                  {selectedPriceOption === "download" ? "Tải ảnh (file kỹ thuật số)" : "In ảnh (bản in vật lý)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Giá:</span>
                <PriceDisplay
                  originalPrice={
                    selectedPriceOption === "download" ? selectedTemplate.download_price : selectedTemplate.print_price
                  }
                  salePrice={
                    selectedPriceOption === "download"
                      ? selectedTemplate.download_sale_price
                      : selectedTemplate.print_sale_price
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    )
  }

  // Thêm hàm để tạo link chia sẻ cho template (thêm vào sau các hàm xử lý khác, trước return)
  const getShareableLink = (templateId: string) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/create?template=${templateId}`
  }

  return (
    <>
      <div className="min-h-screen bg-[#FFF7F9] text-[#B84F6F] pb-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-fit bg-[#B84F6F] text-white hover:bg-[#B84F6F]/80"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại chụp ảnh
            </Button>
            <h1 className="text-2xl font-bold sm:text-3xl">Chọn khung và chỉnh sửa</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 p-1">
              <TabsTrigger
                value="template"
                className="text-[#B84F6F] data-[state=active]:bg-[#B84F6F] data-[state=active]:text-white data-[state=inactive]:hover:bg-[#B84F6F]/10"
              >
                Chọn mẫu
              </TabsTrigger>
              <TabsTrigger
                value="edit"
                disabled={!selectedTemplate}
                className="text-[#B84F6F] data-[state=active]:bg-[#B84F6F] data-[state=active]:text-white data-[state=inactive]:hover:bg-[#B84F6F]/10"
              >
                Chỉnh sửa
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                disabled={!selectedTemplate || !allSlotsHaveImages()}
                className="text-[#B84F6F] data-[state=active]:bg-[#B84F6F] data-[state=active]:text-white data-[state=inactive]:hover:bg-[#B84F6F]/10"
              >
                Xem trước
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template">{renderTemplateSelector()}</TabsContent>
            <TabsContent value="edit">{renderEditor()}</TabsContent>
            <TabsContent value="preview">{renderPreview()}</TabsContent>
          </Tabs>
        </div>
      </div>

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
                  Đang xóa...
                </>
              ) : (
                "Xóa ảnh"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom notification for copy */}
      <CopyNotification
        show={showCopyNotification}
        message={copyMessage}
        onClose={() => setShowCopyNotification(false)}
      />
    </>
  )
}
