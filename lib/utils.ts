import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Tính toán tỷ lệ khung hình từ URL ảnh
 * @param imageUrl URL của ảnh cần tính toán tỷ lệ
 * @returns Promise với tỷ lệ khung hình (width/height)
 */
export function calculateImageAspectRatio(imageUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const aspectRatio = img.width / img.height
      resolve(aspectRatio)
    }

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`))
    }

    img.src = imageUrl
  })
}

/**
 * Tính toán tỷ lệ khung hình từ layout
 * @param layout Mảng các phần tử layout
 * @returns Tỷ lệ khung hình (width/height)
 */
export function calculateLayoutAspectRatio(layout: { x: number; y: number; width: number; height: number }[]): number {
  if (!layout || layout.length === 0) return 1

  // Tìm tọa độ xa nhất bên phải và dưới cùng
  let maxX = 0
  let maxY = 0

  layout.forEach((slot) => {
    const slotRight = slot.x + slot.width
    const slotBottom = slot.y + slot.height

    if (slotRight > maxX) maxX = slotRight
    if (slotBottom > maxY) maxY = slotBottom
  })

  // Tính tỷ lệ dựa trên kích thước tổng thể của layout
  return maxX / maxY
}
