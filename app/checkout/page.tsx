"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Landmark, ArrowRight, Truck, Tag, X, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { generateOrderCode, saveOrderBeforePayment } from "@/services/payment-service"
import { createOrderAction } from "@/app/actions/order-actions"
import SecureImage from "@/components/secure-image"
import Loading from "@/components/loading"

interface CartItem {
  id: string
  previewUrl: string
  templateId: string
  imageIds: string[]
  createdAt: Date
  price: number
  sessionId: string
  quantity: number
  productType: "download" | "print"
  templateName?: string
}

interface CheckoutInfo {
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  total: number
  hasPrintItems?: boolean // Flag để biết có sản phẩm in ảnh hay không
  hasDownloadItems?: boolean // Flag để biết có sản phẩm tải xuống hay không
  isFreeOrder?: boolean // Flag để biết đây là đơn hàng miễn phí
}

interface Voucher {
  id: number
  code: string
  type: "FIXED" | "PERCENTAGE"
  value: number
  discountAmount: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "cod">("bank")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    note: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shippingFee, setShippingFee] = useState(15000) // Default shipping fee
  const [includeDownloadLink, setIncludeDownloadLink] = useState(true) // New state for download link checkbox
  const [hasPrintItems, setHasPrintItems] = useState(false) // State để biết có sản phẩm in ảnh hay không
  const [hasDownloadItems, setHasDownloadItems] = useState(false) // State để biết có sản phẩm tải xuống hay không
  const [isFreeOrder, setIsFreeOrder] = useState(false) // State để biết đây là đơn hàng miễn phí

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("")
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false)
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null)

  // Load checkout info from localStorage
  useEffect(() => {
    const loadCheckoutInfo = () => {
      setIsLoading(true)
      try {
        const checkoutInfoJson = localStorage.getItem("photolab_checkout_info")
        if (!checkoutInfoJson) {
          // No checkout info found, redirect to cart
          toast({
            title: "Không tìm thấy thông tin thanh toán",
            description: "Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán",
            variant: "destructive",
          })
          router.push("/cart")
          return
        }

        const info: CheckoutInfo = JSON.parse(checkoutInfoJson)

        // Kiểm tra nếu đơn hàng miễn phí và chỉ có sản phẩm tải xuống
        if (info.total === 0 && !info.hasPrintItems && !info.isFreeOrder) {
          // Chuyển hướng về trang giỏ hàng để xử lý đơn hàng miễn phí
          router.push("/cart")
          return
        }

        // Kiểm tra xem có sản phẩm in ảnh hay không
        const hasAnyPrintItem = info.hasPrintItems || info.items.some((item) => item.productType === "print")
        setHasPrintItems(hasAnyPrintItem)

        // Kiểm tra xem có sản phẩm tải xuống hay không
        const hasAnyDownloadItem = info.hasDownloadItems || info.items.some((item) => item.productType === "download")
        setHasDownloadItems(hasAnyDownloadItem)

        // Kiểm tra xem đây có phải là đơn hàng miễn phí không
        setIsFreeOrder(info.isFreeOrder || false)

        setCheckoutInfo(info)
      } catch (error) {
        console.error("Error loading checkout info:", error)
        toast({
          title: "Lỗi tải thông tin thanh toán",
          description: "Đã xảy ra lỗi khi tải thông tin thanh toán",
          variant: "destructive",
        })
        router.push("/cart")
      } finally {
        setIsLoading(false)
      }
    }

    loadCheckoutInfo()
  }, [router, toast])

  // Update shipping fee based on city
  useEffect(() => {
    if (hasPrintItems) {
      // Check if city is Hanoi (case insensitive)
      const isHanoi = formData.city.toLowerCase().includes("hà nội") || formData.city.toLowerCase().includes("hanoi")

      setShippingFee(isHanoi ? 15000 : 25000)
    }
  }, [formData.city, hasPrintItems])

  // Format price
  const formatPrice = (price: number) => {
    if (price === 0) return "Miễn phí"

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Calculate subtotal
  const calculateSubtotal = () => {
    if (!checkoutInfo) return 0
    return checkoutInfo.subtotal
  }

  // Calculate shipping fee
  const calculateShippingFee = () => {
    if (!checkoutInfo) return 0
    return hasPrintItems ? shippingFee : 0
  }

  // Calculate discount amount
  const calculateDiscountAmount = () => {
    if (!appliedVoucher) return 0
    return appliedVoucher.discountAmount
  }

  // Calculate total with updated shipping fee and discount
  const calculateTotal = () => {
    if (!checkoutInfo) return 0
    const subtotal = calculateSubtotal()
    const shipping = calculateShippingFee()
    const discount = calculateDiscountAmount()
    return subtotal + shipping - discount
  }

  // Handle checkbox change for download link
  const handleDownloadLinkChange = (checked: boolean) => {
    setIncludeDownloadLink(checked)

    // Reset payment method if needed
    if (checked && paymentMethod === "cod") {
      setPaymentMethod("bank")
    }
  }

  // Apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast({
        title: "Mã giảm giá trống",
        description: "Vui lòng nhập mã giảm giá",
        variant: "destructive",
      })
      return
    }

    setIsApplyingVoucher(true)

    try {
      const response = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: voucherCode,
          orderTotal: calculateSubtotal(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Không thể áp dụng mã giảm giá")
      }

      if (data.valid) {
        setAppliedVoucher(data.voucher)
        toast({
          title: "Áp dụng thành công",
          description: `Mã giảm giá "${data.voucher.code}" đã được áp dụng`,
        })
      }
    } catch (error: any) {
      console.error("Error applying voucher:", error)
      toast({
        title: "Lỗi",
        description: error.message || "Không thể áp dụng mã giảm giá",
        variant: "destructive",
      })
    } finally {
      setIsApplyingVoucher(false)
    }
  }

  // Remove applied voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode("")
  }

  // Gửi email xác nhận đơn hàng COD
  const sendCodOrderConfirmationEmail = async (orderDetails: any) => {
    try {
      const response = await fetch("/api/email/send-order-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderNumber: orderDetails.orderNumber,
          customerName: orderDetails.customerInfo.name,
          customerEmail: orderDetails.customerInfo.email,
          items: orderDetails.items,
          total: orderDetails.total,
          paymentMethod: orderDetails.paymentMethod,
          deliveryOption: orderDetails.deliveryOption,
          includeDownloadLink: orderDetails.includeDownloadLink,
        }),
      })

      if (!response.ok) {
        console.error("Failed to send order confirmation email:", await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error("Error sending order confirmation email:", error)
      return false
    }
  }

  // Thêm hàm gửi email cho đơn hàng miễn phí
  // Thêm hàm này sau hàm sendCodOrderConfirmationEmail

  // Sửa lại hàm sendFreeOrderConfirmationEmail để gửi tất cả sản phẩm trong đơn hàng

  // Thay thế hàm sendFreeOrderConfirmationEmail hiện tại bằng hàm mới này:
  // Gửi email xác nhận đơn hàng miễn phí kèm link tải ảnh
  const sendFreeOrderConfirmationEmail = async (orderDetails: any) => {
    try {
      // Kiểm tra thông tin đơn hàng
      if (!orderDetails || !orderDetails.customerInfo?.email || !orderDetails.orderNumber) {
        console.error("Missing required fields for sending free order email:", { orderDetails })
        return false
      }

      // Lấy thông tin đơn hàng
      const { orderNumber, customerInfo, items } = orderDetails
      const customerEmail = customerInfo.email
      const customerName = customerInfo.name || ""
      const customerPhone = customerInfo.phone || ""

      // Kiểm tra xem có ảnh để tải xuống không
      if (!items || items.length === 0) {
        console.error("No items found for free order:", orderNumber)
        return false
      }

      // Lấy tất cả URL ảnh từ các items
      const downloadImages = items.filter((item: any) => item.previewUrl).map((item: any) => { return { templateName: item.templateName, link: item.previewUrl } })

      if (downloadImages.length === 0) {
        console.error("No preview URLs found for free order:", orderNumber)
        return false
      }

      console.log(`Sending free order email with ${downloadImages.length} images:`, downloadImages)

      // Gọi API gửi email
      const response = await fetch("/api/email/send-free-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customerEmail,
          orderNumber: orderNumber,
          downloadImages: downloadImages,
          customerName: customerName,
          customerPhone: customerPhone,
        }),
      })

      if (!response.ok) {
        console.error("Failed to send free order email:", await response.text())
        return false
      }

      console.log("Free order email sent successfully to:", customerEmail)
      return true
    } catch (error) {
      console.error("Error sending free order email:", error)
      return false
    }
  }

  // Xử lý đơn hàng miễn phí
  const handleFreeOrder = async () => {
    // Validate form
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Thông tin không đầy đủ",
        description: "Vui lòng điền đầy đủ thông tin cần thiết",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Tạo mã đơn hàng
      const orderCode = generateOrderCode()

      // Tạo thông tin đơn hàng để lưu
      const orderDetails = {
        orderNumber: orderCode,
        date: new Date().toISOString(),
        items: checkoutInfo?.items || [],
        subtotal: 0,
        shippingFee: 0,
        discountAmount: 0,
        voucherId: null,
        voucherCode: null,
        total: 0,
        customerInfo: formData,
        paymentMethod: "bank", // Sử dụng giá trị hợp lệ
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

      // Gửi email xác nhận đơn hàng miễn phí
      try {
        const emailSent = await sendFreeOrderConfirmationEmail(orderDetails)
        if (!emailSent) {
          console.warn("Failed to send free order confirmation email, but order was created successfully")
        } else {
          console.log("Free order confirmation email sent successfully")
          toast({
            title: "Email đã được gửi",
            description: "Chúng tôi đã gửi link tải ảnh đến email của bạn.",
          })
        }
      } catch (emailError) {
        console.error("Error sending free order email:", emailError)
        // Không return lỗi ở đây, vì chúng ta vẫn muốn chuyển hướng đến trang thank-you
      }

      // Xóa thông tin giỏ hàng
      localStorage.removeItem("photolab_checkout_info")

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
      setIsSubmitting(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Thông tin không đầy đủ",
        description: "Vui lòng điền đầy đủ thông tin cần thiết",
        variant: "destructive",
      })
      return
    }

    // Validate address for print delivery option
    if (hasPrintItems && (!formData.address || !formData.city)) {
      toast({
        title: "Thông tin không đầy đủ",
        description: "Vui lòng điền đầy đủ địa chỉ giao hàng",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    // Nếu là đơn hàng miễn phí, xử lý riêng
    if (isFreeOrder) {
      await handleFreeOrder()
      return
    }

    // Tạo mã đơn hàng
    const orderCode = generateOrderCode()

    // Tạo thông tin đơn hàng để lưu
    const orderDetails = {
      orderNumber: orderCode,
      date: new Date().toISOString(),
      items: checkoutInfo?.items || [],
      subtotal: checkoutInfo?.subtotal || 0,
      shippingFee: hasPrintItems ? shippingFee : 0,
      discountAmount: calculateDiscountAmount(),
      voucherId: appliedVoucher?.id || null,
      voucherCode: appliedVoucher?.code || null,
      total: calculateTotal(),
      customerInfo: formData,
      paymentMethod,
      deliveryOption: hasPrintItems ? "print" : "download",
      includeDownloadLink: hasPrintItems ? includeDownloadLink : true,
      paymentStatus: paymentMethod === "cod" ? "cod_pending" : "pending", // Thêm trạng thái thanh toán
    }

    // Lưu thông tin đơn hàng
    saveOrderBeforePayment(orderDetails)

    // Chuyển hướng đến trang thanh toán qua QR
    if (paymentMethod === "bank") {
      router.push(`/payment/bank-transfer?orderCode=${orderCode}`)
    } else {
      // COD - Lưu đơn hàng vào database trước khi chuyển hướng
      try {
        // Xử lý imageIds để đảm bảo là JSON hợp lệ
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
          console.error("Failed to create order in database:", result.message)
          toast({
            title: "Lỗi xử lý đơn hàng",
            description: "Đã xảy ra lỗi khi xử lý đơn hàng. Vui lòng thử lại sau.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        // Gửi email xác nhận đơn hàng COD
        const emailSent = await sendCodOrderConfirmationEmail(orderDetails)
        if (!emailSent) {
          console.warn("Failed to send order confirmation email, but order was created successfully")
        } else {
          console.log("Order confirmation email sent successfully")
        }
      } catch (error) {
        console.error("Error creating order:", error)
        toast({
          title: "Lỗi xử lý đơn hàng",
          description: "Đã xảy ra lỗi khi xử lý đơn hàng. Vui lòng thử lại sau.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Lưu thông tin đơn hàng vào localStorage
      localStorage.setItem(
        "photolab_order_details",
        JSON.stringify({
          ...orderDetails,
          paymentStatus: "cod_pending", // Đơn hàng COD đang chờ xử lý
        }),
      )

      // Xóa thông tin giỏ hàng
      localStorage.removeItem("photolab_checkout_info")

      toast({
        title: "Đặt hàng thành công",
        description: "Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ với bạn sớm.",
      })

      // Chuyển hướng đến trang cảm ơn
      router.push("/thank-you")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div> */}
          <Loading />
        </div>
        <Footer />
      </div>
    )
  }

  if (!checkoutInfo) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Thanh toán</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Thông tin khách hàng</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Họ tên <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="example@gmail.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Số điện thoại <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="0912345678"
                        required
                      />
                    </div>

                    {hasPrintItems && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="address">
                            Địa chỉ <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Số nhà, đường, phường/xã"
                            required={hasPrintItems}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city">
                            Tỉnh/Thành phố <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Hà Nội"
                            required={hasPrintItems}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="note">Ghi chú</Label>
                      <Textarea
                        id="note"
                        name="note"
                        value={formData.note}
                        onChange={handleInputChange}
                        placeholder="Ghi chú về đơn hàng của bạn"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!isFreeOrder && (
                <Card className="mb-8">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Phương thức thanh toán</h2>

                    {/* Download link checkbox for print option */}
                    {hasPrintItems && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="downloadLink"
                            checked={includeDownloadLink}
                            onCheckedChange={handleDownloadLinkChange}
                          />
                          <Label htmlFor="downloadLink" className="text-sm font-medium cursor-pointer">
                            Nhận link tải ảnh luôn
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-6">
                          Bạn sẽ nhận được link tải ảnh qua email ngay sau khi thanh toán thành công, không cần đợi nhận
                          ảnh in.
                        </p>
                      </div>
                    )}

                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as "bank" | "cod")}
                      className="space-y-4"
                    >
                      <div
                        className={`flex items-start space-x-3 border rounded-lg p-4 ${paymentMethod === "bank" ? "border-primary bg-primary/5" : "border-gray-200"}`}
                      >
                        <RadioGroupItem value="bank" id="bank" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="bank" className="flex items-center cursor-pointer">
                            <Landmark className="h-5 w-5 mr-2 text-gray-600" />
                            <span>Chuyển khoản ngân hàng</span>
                          </Label>
                          <p className="text-sm text-gray-500 mt-2 ml-7">
                            Quét mã QR để chuyển khoản trực tiếp đến tài khoản ngân hàng của chúng tôi
                          </p>

                          {paymentMethod === "bank" && (
                            <div className="mt-4 ml-7 p-4 bg-gray-50 rounded-lg">
                              <p className="font-medium">Thông tin tài khoản:</p>
                              <ul className="mt-2 space-y-1 text-sm">
                                <li>Ngân hàng: OCB - Ngân hàng thương mại cổ phần Phương Đông</li>
                                <li>Số tài khoản: 0160101888866666</li>
                                <li>Chủ tài khoản: Nghiem Thi Lien</li>
                                <li>Nội dung: [Mã đơn hàng]</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COD payment option - only show when print delivery is selected and download link is not included */}
                      {hasPrintItems && !includeDownloadLink && (
                        <div
                          className={`flex items-start space-x-3 border rounded-lg p-4 ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-gray-200"}`}
                        >
                          <RadioGroupItem value="cod" id="cod" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="cod" className="flex items-center cursor-pointer">
                              <Truck className="h-5 w-5 mr-2 text-gray-600" />
                              <span>Thanh toán khi nhận hàng (COD)</span>
                            </Label>
                            <p className="text-sm text-gray-500 mt-2 ml-7">Bạn sẽ thanh toán khi nhận được ảnh in</p>
                          </div>
                        </div>
                      )}
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                  </>
                ) : isFreeOrder ? (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Tải ảnh miễn phí
                  </>
                ) : (
                  <>
                    Hoàn tất đơn hàng <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Đơn hàng của bạn</h2>

                <div className="space-y-4 mb-6">
                  {checkoutInfo.items.map((item) => (
                    <div key={item.id} className="flex space-x-4 pb-4 border-b border-gray-100">
                      <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
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
                      <div className="flex-1">
                        <h3 className="font-medium">Ảnh ghép {item.templateName || item.templateId}</h3>
                        <p className="text-sm text-gray-500">
                          {item.productType === "download"
                            ? "Tải ảnh (file kỹ thuật số)"
                            : `${item.quantity} vỉ ảnh chất lượng cao`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.productType === "print" && item.quantity > 1
                            ? `${formatPrice(item.price)} × ${item.quantity}`
                            : formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Voucher input - chỉ hiển thị nếu không phải đơn hàng miễn phí */}
                {!isFreeOrder && (
                  <div className="mb-6">
                    {appliedVoucher ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 text-green-600 mr-2" />
                          <div>
                            <p className="font-medium text-green-700">{appliedVoucher.code}</p>
                            <p className="text-xs text-green-600">
                              {appliedVoucher.type === "FIXED"
                                ? `Giảm ${formatPrice(appliedVoucher.value)}`
                                : `Giảm ${appliedVoucher.value}%`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveVoucher}
                          className="h-8 w-8 rounded-full text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="voucher">Mã giảm giá</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="voucher"
                            placeholder="Nhập mã giảm giá"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleApplyVoucher}
                            disabled={isApplyingVoucher || !voucherCode.trim()}
                          >
                            {isApplyingVoucher ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              "Áp dụng"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tạm tính</span>
                    <span>{formatPrice(calculateSubtotal())}</span>
                  </div>

                  {!isFreeOrder && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phí vận chuyển</span>
                      <span>{formatPrice(calculateShippingFee())}</span>
                    </div>
                  )}

                  {appliedVoucher && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá</span>
                      <span>-{formatPrice(calculateDiscountAmount())}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
                    <span>Tổng cộng</span>
                    <span>{isFreeOrder ? "Miễn phí" : formatPrice(calculateTotal())}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Thông tin giao hàng</h3>
                  <p className="text-sm text-gray-600">
                    {isFreeOrder
                      ? "Bạn sẽ nhận được link tải ảnh miễn phí qua email sau khi hoàn tất đơn hàng."
                      : hasDownloadItems && !hasPrintItems
                        ? "Bạn sẽ nhận được link tải ảnh qua email sau khi thanh toán thành công."
                        : includeDownloadLink
                          ? "Bạn sẽ nhận được link tải ảnh qua email sau khi thanh toán thành công và ảnh in sẽ được giao đến địa chỉ của bạn trong vòng 3-5 ngày làm việc."
                          : "Ảnh in sẽ được giao đến địa chỉ của bạn trong vòng 3-5 ngày làm việc."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
