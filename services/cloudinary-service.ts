import { v4 as uuidv4 } from "uuid"

// Interface cho thông tin ảnh lưu trữ
export interface StoredImage {
  id: string
  url: string
  publicId: string
  originalFilename: string
  createdAt: Date
  sessionId: string
  metadata?: Record<string, any>
}

// Interface cho thông tin giỏ hàng
export interface CartItem {
  id: string
  previewUrl: string
  templateId: string
  imageIds: string[]
  createdAt: Date
  price: number
  sessionId: string
  quantity?: number // Số lượng vỉ ảnh
  productType?: "download" | "print" // Loại sản phẩm: tải xuống hoặc in ấn
  templateName?: string // Tên template
  download_price?: number // Giá tải xuống gốc
  download_sale_price?: number // Giá tải xuống khuyến mãi
  print_price?: number // Giá in ảnh gốc
  print_sale_price?: number // Giá in ảnh khuyến mãi
  template?: {
    name?: string
    id?: string
    image?: string
    category?: string[]
  }
}

// Cloudinary configuration
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "daard9oly"
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "photolab_preset"
const userUploadcloudName = process.env.NEXT_PUBLIC_USER_CLOUDINARY_CLOUD_NAME || "dgcuc2imm"
const userUploadPreset = process.env.NEXT_PUBLIC_USER_CLOUDINARY_UPLOAD_PRESET || "from_user_photolab_preset"

// Upload ảnh lên Cloudinary
export async function uploadImage(file: File, sessionId: string): Promise<StoredImage> {
  try {
    // Tạo form data để upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", uploadPreset)
    formData.append("cloud_name", cloudName)
    formData.append("folder", `photolab/${sessionId}`)

    // Thêm metadata
    formData.append("context", `sessionId=${sessionId}`)

    // Upload file lên Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Tạo và trả về thông tin ảnh đã lưu trữ
    const storedImage: StoredImage = {
      id: uuidv4(),
      url: data.secure_url,
      publicId: data.public_id,
      originalFilename: file.name,
      createdAt: new Date(),
      sessionId,
      metadata: {
        size: file.size,
        type: file.type,
        width: data.width,
        height: data.height,
        format: data.format,
      },
    }

    // Lưu thông tin ảnh vào localStorage để dễ truy xuất sau này
    saveImageToLocalStorage(storedImage)

    return storedImage
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error)
    throw error
  }
}

// Upload ảnh của user lên Cloudinary
export async function uploadUserImage(file: File, sessionId: string): Promise<StoredImage> {
  try {
    // Tạo form data để upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", userUploadPreset)
    formData.append("cloud_name", userUploadcloudName)
    formData.append("folder", `photolab/${sessionId}`)

    // Thêm metadata
    formData.append("context", `sessionId=${sessionId}`)

    // Upload file lên Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${userUploadcloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Tạo và trả về thông tin ảnh đã lưu trữ
    const storedImage: StoredImage = {
      id: uuidv4(),
      url: data.secure_url,
      publicId: data.public_id,
      originalFilename: file.name,
      createdAt: new Date(),
      sessionId,
      metadata: {
        size: file.size,
        type: file.type,
        width: data.width,
        height: data.height,
        format: data.format,
      },
    }

    // Lưu thông tin ảnh vào localStorage để dễ truy xuất sau này
    saveImageToLocalStorage(storedImage)

    return storedImage
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error)
    throw error
  }
}

// Xóa ảnh khỏi Cloudinary
export async function deleteImage(publicId: string, sessionId: string): Promise<boolean> {
  try {
    // Gọi API xóa ảnh từ Cloudinary
    // Lưu ý: Thông thường việc xóa ảnh nên được thực hiện thông qua backend để bảo mật
    // Nhưng trong demo này, chúng ta sẽ sử dụng một API route để xóa ảnh
    const response = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId }),
    })

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`)
    }

    // Xóa ảnh khỏi localStorage
    removeImageFromLocalStorage(publicId, sessionId)

    return true
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error)
    throw error
  }
}

// Lưu thông tin ảnh vào localStorage
function saveImageToLocalStorage(image: StoredImage): void {
  try {
    // Lấy danh sách ảnh hiện tại
    const storedImagesJson = localStorage.getItem(`photolab_images_${image.sessionId}`)
    const storedImages: StoredImage[] = storedImagesJson ? JSON.parse(storedImagesJson) : []

    // Thêm ảnh mới vào danh sách
    storedImages.push(image)

    // Lưu lại danh sách
    localStorage.setItem(`photolab_images_${image.sessionId}`, JSON.stringify(storedImages))
  } catch (error) {
    console.error("Error saving image to localStorage:", error)
  }
}

// Xóa thông tin ảnh khỏi localStorage
function removeImageFromLocalStorage(publicId: string, sessionId: string): void {
  try {
    // Lấy danh sách ảnh hiện tại
    const storedImagesJson = localStorage.getItem(`photolab_images_${sessionId}`)
    if (!storedImagesJson) return

    const storedImages: StoredImage[] = JSON.parse(storedImagesJson)

    // Lọc ra các ảnh không có publicId trùng với ảnh cần xóa
    const updatedImages = storedImages.filter((image) => image.publicId !== publicId)

    // Lưu lại danh sách đã cập nhật
    localStorage.setItem(`photolab_images_${sessionId}`, JSON.stringify(updatedImages))
  } catch (error) {
    console.error("Error removing image from localStorage:", error)
  }
}

// Lấy tất cả ảnh của một phiên làm việc từ localStorage
export async function getSessionImages(sessionId: string): Promise<StoredImage[]> {
  try {
    const storedImagesJson = localStorage.getItem(`photolab_images_${sessionId}`)
    if (!storedImagesJson) return []

    const storedImages: StoredImage[] = JSON.parse(storedImagesJson)
    return storedImages
  } catch (error) {
    console.error("Error getting session images:", error)
    return []
  }
}

async function compressImage(blob: Blob, quality = 0.7): Promise<Blob> {
  const img = new Image()
  img.src = URL.createObjectURL(blob)

  await new Promise((resolve) => (img.onload = resolve))

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext("2d")
  ctx?.drawImage(img, 0, 0)

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((compressedBlob) => {
      if (compressedBlob) {
        resolve(compressedBlob)
      } else {
        throw new Error("Compression failed")
      }
    }, "image/jpeg", quality)
  )
}


// Lưu ảnh preview vào giỏ hàng
export async function saveToCart(
  previewUrl: string,
  templateId: string,
  imageIds: string[],
  price: number,
  sessionId: string,
  productType = "download", // Thêm tham số productType với giá trị mặc định là "download"
  templateName = "", // Thêm tham số templateName
  download_price?: number, // Giá tải xuống gốc
  download_sale_price?: number, // Giá tải xuống khuyến mãi
  print_price?: number, // Giá in ảnh gốc
  print_sale_price?: number, // Giá in ảnh khuyến mãi
): Promise<CartItem> {
  try {
    // Upload ảnh preview lên Cloudinary
    const response = await fetch(previewUrl)
    const blob = await response.blob()

    // Nén ảnh nếu vượt quá 10MB
    let finalBlob = blob
    if (blob.size > 10 * 1024 * 1024) {
      finalBlob = await compressImage(blob, 0.7) // chất lượng ~70%
    }

    // const file = new File([blob], `preview-${uuidv4()}.jpg`, { type: "image/jpeg" })
    const file = new File([finalBlob], `preview-${uuidv4()}.jpg`, { type: "image/jpeg" })
    console.log("file", file)

    // Tạo form data để upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", uploadPreset)
    formData.append("cloud_name", cloudName)
    formData.append("folder", `photolab/${sessionId}/cart`)

    // Upload file lên Cloudinary
    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`)
    }

    const data = await uploadResponse.json()

    // Tạo cart item
    const cartItem: CartItem = {
      id: uuidv4(),
      previewUrl: data.secure_url,
      templateId,
      imageIds,
      createdAt: new Date(),
      price,
      sessionId,
      quantity: 1, // Mặc định là 1 vỉ
      productType, // Thêm loại sản phẩm
      templateName, // Thêm tên template
      download_price, // Giá tải xuống gốc
      download_sale_price, // Giá tải xuống khuyến mãi
      print_price, // Giá in ảnh gốc
      print_sale_price, // Giá in ảnh khuyến mãi
    }

    // Lưu cart item vào localStorage
    saveCartItemToLocalStorage(cartItem)

    return cartItem
  } catch (error) {
    console.error("Error saving to cart:", error)
    throw error
  }
}

// Lưu cart item vào localStorage
function saveCartItemToLocalStorage(cartItem: CartItem): void {
  try {
    // Lấy danh sách cart item hiện tại
    const cartItemsJson = localStorage.getItem(`photolab_cart_${cartItem.sessionId}`)
    const cartItems: CartItem[] = cartItemsJson ? JSON.parse(cartItemsJson) : []

    // Thêm cart item mới vào danh sách
    cartItems.push(cartItem)

    // Lưu lại danh sách
    localStorage.setItem(`photolab_cart_${cartItem.sessionId}`, JSON.stringify(cartItems))
  } catch (error) {
    console.error("Error saving cart item to localStorage:", error)
  }
}

// Lấy các item trong giỏ hàng
export async function getCartItems(sessionId: string): Promise<CartItem[]> {
  try {
    const cartItemsJson = localStorage.getItem(`photolab_cart_${sessionId}`)
    if (!cartItemsJson) return []

    const cartItems: CartItem[] = JSON.parse(cartItemsJson)
    return cartItems
  } catch (error) {
    console.error("Error getting cart items:", error)
    return []
  }
}

// Xóa item khỏi giỏ hàng
export async function removeFromCart(cartItemId: string, sessionId: string): Promise<void> {
  try {
    // Lấy danh sách cart item hiện tại
    const cartItemsJson = localStorage.getItem(`photolab_cart_${sessionId}`)
    if (!cartItemsJson) return

    const cartItems: CartItem[] = JSON.parse(cartItemsJson)

    // Tìm cart item cần xóa
    const cartItemIndex = cartItems.findIndex((item) => item.id === cartItemId)
    if (cartItemIndex === -1) return

    // Xóa cart item khỏi danh sách
    cartItems.splice(cartItemIndex, 1)

    // Lưu lại danh sách
    localStorage.setItem(`photolab_cart_${sessionId}`, JSON.stringify(cartItems))
  } catch (error) {
    console.error("Error removing from cart:", error)
  }
}

// Cập nhật số lượng vỉ ảnh
export async function updateCartItemQuantity(cartItemId: string, quantity: number, sessionId: string): Promise<void> {
  try {
    // Lấy danh sách cart item hiện tại
    const cartItemsJson = localStorage.getItem(`photolab_cart_${sessionId}`)
    if (!cartItemsJson) return

    const cartItems: CartItem[] = JSON.parse(cartItemsJson)

    // Tìm cart item cần cập nhật
    const cartItemIndex = cartItems.findIndex((item) => item.id === cartItemId)
    if (cartItemIndex === -1) return

    // Cập nhật số lượng
    cartItems[cartItemIndex].quantity = quantity

    // Lưu lại danh sách
    localStorage.setItem(`photolab_cart_${sessionId}`, JSON.stringify(cartItems))
  } catch (error) {
    console.error("Error updating cart item quantity:", error)
  }
}

// Cập nhật loại sản phẩm (download/print)
export async function updateCartItemProductType(
  cartItemId: string,
  productType: "download" | "print",
  sessionId: string,
): Promise<void> {
  try {
    // Lấy danh sách cart item hiện tại
    const cartItemsJson = localStorage.getItem(`photolab_cart_${sessionId}`)
    if (!cartItemsJson) return

    const cartItems: CartItem[] = JSON.parse(cartItemsJson)

    // Tìm cart item cần cập nhật
    const cartItemIndex = cartItems.findIndex((item) => item.id === cartItemId)
    if (cartItemIndex === -1) return

    // Cập nhật loại sản phẩm
    cartItems[cartItemIndex].productType = productType

    // Nếu chuyển sang download, đặt số lượng về 1
    if (productType === "download") {
      cartItems[cartItemIndex].quantity = 1
    }

    // Lưu lại danh sách
    localStorage.setItem(`photolab_cart_${sessionId}`, JSON.stringify(cartItems))
  } catch (error) {
    console.error("Error updating cart item product type:", error)
  }
}

// Xóa tất cả sản phẩm trong giỏ hàng
export async function clearCart(sessionId: string): Promise<void> {
  try {
    localStorage.removeItem(`photolab_cart_${sessionId}`)
  } catch (error) {
    console.error("Error clearing cart:", error)
  }
}
