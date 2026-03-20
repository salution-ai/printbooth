"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, ArrowRight, Download, Printer, Plus, Minus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import { getCartItems, removeFromCart, type CartItem, updateCartItemProductType } from "@/services/cloudinary-service"
import { generateOrderCode, saveOrderBeforePayment } from "@/services/payment-service"
import { createOrderAction } from "@/app/actions/order-actions"
import SecureImage from "@/components/secure-image"
import { LoadingSpinner } from "@/components/loading-spinner"
import Loading from "@/components/loading"

// Interface cho thông tin template
interface TemplateInfo {
  template_id: string
  template_name: string
  price: number
  download_price: number
  download_sale_price: number | null
  print_price: number
  print_sale_price: number | null
}

export default function CartPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { sessionId, isLoading: isSessionLoading } = useSession()

  // State
  const [cartItems, setCartItems] = useState<(CartItem & { quantity: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [templateInfos, setTemplateInfos] = useState<Record<string, TemplateInfo>>({})
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Load cart items from localStorage when component mounts
  useEffect(() => {
    const loadCartItems = async () => {
      if (!sessionId || isSessionLoading) return

      setIsLoading(true)
      try {
        const items = await getCartItems(sessionId)
        // Add quantity property to each item
        const itemsWithQuantity = items.map((item) => ({
          ...item,
          quantity: item.quantity || 1, // Default quantity is 1
        }))
        setCartItems(itemsWithQuantity)

        // Lấy danh sách templateId để fetch thông tin
        const templateIds = [...new Set(itemsWithQuantity.map((item) => item.templateId))]
        await fetchTemplateInfos(templateIds)
      } catch (error) {
        console.error("Error loading cart items:", error)
        toast({
          title: "Lỗi tải giỏ hàng",
          description: "Đã xảy ra lỗi khi tải thông tin giỏ hàng",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (sessionId && !isSessionLoading) {
      loadCartItems()
    }
  }, [sessionId, isSessionLoading, toast])

  // Fetch template infos
  const fetchTemplateInfos = async (templateIds: string[]) => {
    setIsLoadingTemplates(true)
    try {
      const templateInfosObj: Record<string, TemplateInfo> = {}

      // Fetch template info for each templateId
      await Promise.all(
        templateIds.map(async (templateId) => {
          try {
            const response = await fetch(`/api/templates/${templateId}`)
            if (!response.ok) {
              throw new Error(`Failed to fetch template info for template ${templateId}`)
            }
            const data = await response.json()
            templateInfosObj[templateId] = data.template
          } catch (error) {
            console.error(`Error fetching template info for template ${templateId}:`, error)
          }
        }),
      )

      setTemplateInfos(templateInfosObj)
    } catch (error) {
      console.error("Error fetching template infos:", error)
      toast({
        title: "Lỗi tải thông tin template",
        description: "Đã xảy ra lỗi khi tải thông tin template",
        variant: "destructive",
      })
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Get item price based on product type and template info
  const getItemPrice = (item: CartItem & { quantity: number }) => {
    // Lấy thông tin template từ state
    const templateInfo = templateInfos[item.templateId]

    // Nếu không có thông tin template, sử dụng giá mặc định từ item
    if (!templateInfo) {
      return item.price
    }

    if (item.productType === "download") {
      // Nếu có giá khuyến mãi download, sử dụng giá đó
      if (templateInfo.download_sale_price !== null) {
        return templateInfo.download_sale_price
      }
      // Nếu có giá download, sử dụng giá đó
      if (templateInfo.download_price !== undefined && templateInfo.download_price !== null) {
        return templateInfo.download_price
      }
      // Nếu không, sử dụng giá mặc định
      return templateInfo.price
    } else {
      // Nếu có giá khuyến mãi in ảnh, sử dụng giá đó
      if (templateInfo.print_sale_price !== null) {
        return templateInfo.print_sale_price
      }
      // Nếu có giá in ảnh, sử dụng giá đó
      if (templateInfo.print_price !== undefined && templateInfo.print_price !== null) {
        return templateInfo.print_price
      }
      // Nếu không có giá in ảnh, sử dụng giá download + 20000 (phí in mặc định)
      const downloadPrice = templateInfo.download_price || templateInfo.price
      return downloadPrice + 20000
    }
  }

  // Calculate total
  const subtotal = cartItems.reduce((total, item) => {
    // Tính giá dựa trên loại sản phẩm (download hoặc print)
    const itemPrice = getItemPrice(item)
    return total + itemPrice * item.quantity
  }, 0)

  // Calculate shipping fee based on whether any item is print type
  const hasPrintItems = cartItems.some((item) => item.productType === "print")
  const hasDownloadItems = cartItems.some((item) => item.productType === "download")
  const deliveryFee = hasPrintItems ? 15000 : 0

  const total = subtotal + deliveryFee

  // Format price
  const formatPrice = (price: number) => {
    if (price === 0) return "Miễn phí"

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Remove item from cart
  const handleRemoveItem = async (id: string) => {
    if (!sessionId) return

    try {
      await removeFromCart(id, sessionId)

      // Update local state
      setCartItems(cartItems.filter((item) => item.id !== id))

      toast({
        title: "Đã xóa khỏi giỏ hàng",
        description: "Sản phẩm đã được xóa khỏi giỏ hàng",
      })
    } catch (error) {
      console.error("Error removing item from cart:", error)
      toast({
        title: "Lỗi xóa sản phẩm",
        description: "Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng",
        variant: "destructive",
      })
    }
  }

  // Handle quantity change
  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return // Don't allow quantity less than 1

    setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
  }

  // Handle product type change
  const handleProductTypeChange = async (id: string, newType: "download" | "print") => {
    if (!sessionId) return

    try {
      // Update in localStorage
      await updateCartItemProductType(id, newType, sessionId)

      // Update local state
      setCartItems(
        cartItems.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              productType: newType,
              // Reset quantity to 1 when switching to download
              quantity: newType === "download" ? 1 : item.quantity,
            }
          }
          return item
        }),
      )

      toast({
        title: "Đã cập nhật hình thức nhận hàng",
        description: `Sản phẩm đã được chuyển sang hình thức ${newType === "download" ? "tải xuống" : "in ảnh"}`,
      })
    } catch (error) {
      console.error("Error updating product type:", error)
      toast({
        title: "Lỗi cập nhật hình thức",
        description: "Đã xảy ra lỗi khi cập nhật hình thức nhận hàng",
        variant: "destructive",
      })
    }
  }

  // Handle free order
  const handleFreeOrder = async () => {
    setIsProcessing(true)

    try {
      // Tạo mã đơn hàng
      const orderCode = generateOrderCode()

      // Cập nhật thông tin sản phẩm
      const updatedItems = cartItems.map((item) => ({
        ...item,
      }))

      // Tạo thông tin đơn hàng
      const orderDetails = {
        orderNumber: orderCode,
        date: new Date().toISOString(),
        items: updatedItems,
        subtotal: 0,
        shippingFee: 0,
        discountAmount: 0,
        voucherId: null,
        voucherCode: null,
        total: 0,
        customerInfo: {
          name: "Khách hàng miễn phí", // Sẽ được cập nhật ở trang thank-you
          email: "",
          phone: "",
          address: "",
          city: "",
          note: "Đơn hàng miễn phí tự động",
        },
        paymentMethod: "bank", // Sử dụng giá trị hợp lệ thay vì "free"
        deliveryOption: "download",
        includeDownloadLink: true,
        paymentStatus: "paid", // Đánh dấu là đã thanh toán vì miễn phí
      }

      // Lưu thông tin đơn hàng
      saveOrderBeforePayment(orderDetails)

      // Lưu đơn hàng vào database
      const processedItems = orderDetails.items.map((item: any) => ({
        ...item,
        imageIds: Array.isArray(item.imageIds)
          ? JSON.stringify(item.imageIds)
          : typeof item.imageIds === "string"
            ? item.imageIds.startsWith("[")
              ? item.imageIds
              : JSON.stringify([item.imageIds])
            : JSON.stringify([]),
      }))

      const orderDataToCreate = {
        ...orderDetails,
        items: processedItems,
      }

      // Gọi Server Action để lưu đơn hàng vào database
      const result = await createOrderAction(orderDataToCreate)

      if (!result.success) {
        throw new Error(result.message || "Lỗi khi tạo đơn hàng")
      }

      // Xóa giỏ hàng
      localStorage.removeItem("photolab_cart")

      // Chuyển hướng đến trang cảm ơn
      router.push(`/thank-you?free=true&orderCode=${orderCode}`)
    } catch (error) {
      console.error("Error processing free order:", error)
      toast({
        title: "Lỗi xử lý đơn hàng",
        description: "Đã xảy ra lỗi khi xử lý đơn hàng miễn phí",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Check if all items are free downloads
  const isAllFreeDownloads =
    cartItems.length > 0 &&
    cartItems.every((item) => {
      const templateInfo = templateInfos[item.templateId]
      if (!templateInfo) return false

      if (item.productType === "download") {
        // Kiểm tra giá download
        if (templateInfo.download_sale_price !== null && templateInfo.download_sale_price === 0) {
          return true
        }
        if (templateInfo.download_price === 0) {
          return true
        }
        return item.price === 0
      }
      return false
    })

  // Proceed to checkout
  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Giỏ hàng trống",
        description: "Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán",
        variant: "destructive",
      })
      return
    }

    // Cập nhật giá cho mỗi sản phẩm dựa trên loại sản phẩm
    const itemsWithUpdatedPrices = cartItems.map((item) => {
      const price = getItemPrice(item)
      return {
        ...item,
        price,
      }
    })

    // Store cart information in localStorage for checkout page
    localStorage.setItem(
      "photolab_checkout_info",
      JSON.stringify({
        items: itemsWithUpdatedPrices,
        subtotal,
        deliveryFee,
        total,
        hasPrintItems, // Thêm flag để biết có sản phẩm in ảnh hay không
        hasDownloadItems, // Thêm flag để biết có sản phẩm tải xuống hay không
        isFreeOrder: isAllFreeDownloads, // Thêm flag để biết đây là đơn hàng miễn phí
      }),
    )

    router.push("/checkout")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Giỏ hàng</h1>

        {isLoading || isLoadingTemplates ? (
          <div className="flex justify-center py-12">
            {/* <LoadingSpinner /> */}
            <Loading />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Giỏ hàng của bạn đang trống</h2>
            <p className="text-gray-600 mb-8">Hãy thêm một số sản phẩm vào giỏ hàng để tiếp tục</p>
            <Button asChild className="rounded-full">
              <Link href="/create">Tạo ảnh ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Sản phẩm ({cartItems.length})</h2>

                  <div className="space-y-6">
                    {cartItems.map((item) => {
                      const itemPrice = getItemPrice(item)
                      const templateInfo = templateInfos[item.templateId]
                      const templateName =
                        templateInfo?.template_name || item.templateName || `Template ${item.templateId}`

                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row border-b border-gray-200 pb-6">
                          <div className="sm:w-1/4 mb-4 sm:mb-0">
                            <div className="relative aspect-square rounded-lg overflow-hidden">
                              {item.previewUrl ? (
                                <SecureImage
                                  src={item.previewUrl}
                                  alt={`Ảnh ghép ${item.templateId}`}
                                  className="aspect-square"
                                  watermarkText="TULIE PHOTOLAB PREVIEW"
                                  blurLevel={2}
                                />
                              ) : (
                                <Image
                                  src="/placeholder.svg?height=300&width=300"
                                  alt={`Ảnh ghép ${item.templateId}`}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                          </div>

                          <div className="sm:w-3/4 sm:pl-6 flex flex-col">
                            <div className="flex justify-between mb-2">
                              <h3 className="font-bold">Ảnh ghép {templateName}</h3>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                <Trash2 className="h-5 w-5 text-gray-500" />
                              </Button>
                            </div>

                            <div className="flex flex-col">
                              {/* <span className="font-medium">{templateName}</span> */}

                              {/* Hình thức nhận hàng cho từng sản phẩm */}
                              <div className="mt-2 mb-3">
                                <p className="text-sm text-gray-600 mb-2">Hình thức nhận hàng:</p>
                                <div className="flex space-x-2">
                                  <Button
                                    variant={item.productType === "download" ? "default" : "outline"}
                                    size="sm"
                                    className="flex items-center"
                                    onClick={() => handleProductTypeChange(item.id, "download")}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Tải xuống
                                  </Button>
                                  <Button
                                    variant={item.productType === "print" ? "default" : "outline"}
                                    size="sm"
                                    className="flex items-center"
                                    onClick={() => handleProductTypeChange(item.id, "print")}
                                  >
                                    <Printer className="h-4 w-4 mr-1" />
                                    In ảnh
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <p className="text-gray-600 mb-4">
                              {item.productType === "download"
                                ? "Tải ảnh (file kỹ thuật số)"
                                : "In ảnh (bản in vật lý)"}
                            </p>

                            {/* Quantity selector - only show for print option */}
                            {item.productType === "print" && (
                              <div className="flex items-center mb-4">
                                <span className="text-sm text-gray-600 mr-3">Số lượng:</span>
                                <div className="flex items-center">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleQuantityChange(item.id, Number.parseInt(e.target.value) || 1)
                                    }
                                    className="w-14 h-8 mx-2 text-center"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="mt-auto flex justify-between items-center">
                              <p className="font-bold">
                                {item.productType === "print" && item.quantity > 1
                                  ? `${formatPrice(itemPrice)} × ${item.quantity} = ${formatPrice(itemPrice * item.quantity)}`
                                  : formatPrice(itemPrice)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/create">Tiếp tục mua sắm</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Tóm tắt đơn hàng</h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tạm tính</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Phí vận chuyển</span>
                      <span>
                        {hasPrintItems ? `${formatPrice(15000)} - ${formatPrice(25000)}` : formatPrice(deliveryFee)}
                      </span>
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex justify-between font-bold">
                      <span>Tổng cộng</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button className="w-full" onClick={proceedToCheckout} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        Thanh toán <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
