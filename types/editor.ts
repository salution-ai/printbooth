export interface Template {
  id: string
  name: string
  slots: number
  image: string
  frameImage: string
  frameUrl?: string // URL của frame trên Cloudinary
  aspectRatio?: number // Optional aspect ratio for non-square frames
  layout: TemplateLayout[]
  category: string[] // Categories the template belongs to
  price?: number // Giá cũ (sẽ dần loại bỏ)
  download_price: number // Giá gốc cho việc tải ảnh
  download_sale_price?: number // Giá khuyến mãi cho việc tải ảnh
  print_price: number // Giá gốc cho việc in ảnh
  print_sale_price?: number // Giá khuyến mãi cho việc in ảnh
}

export interface TemplateLayout {
  id: string
  x: number
  y: number
  width: number
  height: number
  customPosition?: boolean // Flag to indicate if this slot has been custom positioned
}

export interface UploadedImage {
  id: string
  file: File
  url: string
  position: { x: number; y: number }
  scale: number
  rotation: number
  slotId: string | null
  slotPosition?: number // Position in the layout array
  cloudinaryId?: string // ID của ảnh trên Cloudinary
  publicId?: string // Public ID của ảnh trên Cloudinary
}

export interface TemplateCategory {
  id: string
  name: string
}

export interface PriceOption {
  type: "download" | "print"
  label: string
  original_price: number
  sale_price?: number
}
