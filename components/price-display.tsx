interface PriceDisplayProps {
  originalPrice: number
  salePrice?: number | null
}

export function PriceDisplay({ originalPrice, salePrice }: PriceDisplayProps) {
  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return ""
    if (price === 0) return "Miễn phí"
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price)
  }

  // Tính phần trăm giảm giá
  const calculateDiscountPercentage = () => {
    if (salePrice === undefined || salePrice === null) return 0    
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100)
  }

  return (
    <div className="flex flex-col">
      {(salePrice !== undefined && salePrice !== null) ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{formatPrice(salePrice)}</span>
            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-sm font-medium">
              -{calculateDiscountPercentage()}%
            </span>
          </div>
          <span className="text-sm text-gray-500 line-through">{formatPrice(originalPrice)}</span>
        </>
      ) : (
        <span className="text-lg font-bold text-primary">{formatPrice(originalPrice)}</span>
      )}
    </div>
  )
}
