"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Download, Home, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updatePaymentStatusAction } from "@/app/actions/order-actions"
import { LoadingSpinner } from "@/components/loading-spinner"

interface CartItem {
  id: string
  previewUrl: string
  templateId: string
  imageIds: string[]
  createdAt: string
  price: number
  sessionId: string
  quantity: number
}

interface OrderDetails {
  orderNumber: string
  date: string
  items: CartItem[]
  subtotal: number
  shippingFee: number
  total: number
  customerInfo: {
    name: string
    email: string
    phone: string
    address?: string
    city?: string
    note?: string
  }
  paymentMethod: "bank" | "cod"
  paymentStatus: "pending" | "paid" | "cod_pending"
  deliveryOption: "download" | "print"
  includeDownloadLink?: boolean
}

export default function ThankYouPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get order details from localStorage
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending")
  const [email, setEmail] = useState("")
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [orderFromDB, setOrderFromDB] = useState<any>(null)

  // Check if this is a free order
  const isFreeOrder = searchParams.get("free") === "true"
  const orderCode = searchParams.get("orderCode")
  // Check if payment was successful (passed from payment page)
  const paymentSuccess = searchParams.get("paymentSuccess") === "true"

  // Fetch order details from database
  const fetchOrderFromDB = async (orderNumber: string) => {
    try {
      const response = await fetch(`/api/orders/get-by-number?orderNumber=${orderNumber}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.order) {
          console.log("Order fetched from DB:", data.order)
          setOrderFromDB(data.order)

          // Update payment status based on database information
          // if (data.order.paymentStatus === "paid" || data.order.paymentStatus === "cod_pending") {
          if (data.order.paymentStatus === "paid") {
            setPaymentStatus("paid")
          } else if (data.order.paymentStatus === "failed") {
            setPaymentStatus("failed")
          } else {
            setPaymentStatus("pending")
          }

          return data.order
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching order from DB:", error)
      return null
    }
  }

  useEffect(() => {
    const loadOrderDetails = async () => {
      setIsLoading(true)
      try {
        // For free orders, we use the orderCode from URL
        if (isFreeOrder && orderCode) {
          const savedOrderJson = localStorage.getItem("photolab_payment_info")
          if (savedOrderJson) {
            const savedOrders = JSON.parse(savedOrderJson)
            const freeOrder = savedOrders[orderCode]

            if (freeOrder) {
              setOrderDetails({
                ...freeOrder,
                paymentStatus: "paid",
                isFreeOrder: true,
                date: freeOrder.date || new Date().toISOString(),
                total: freeOrder.total || 0,
              })
              setPaymentStatus("paid")

              // Đánh dấu email đã được submit vì đã nhập ở bước checkout
              setEmailSubmitted(true)

              // Nếu đơn hàng có email, lưu lại để hiển thị
              if (freeOrder.customerEmail) {
                setEmail(freeOrder.customerEmail)
              }
            } else {
              // Nếu không tìm thấy đơn hàng trong localStorage, tạo đối tượng đơn hàng tối thiểu
              setOrderDetails({
                orderNumber: orderCode,
                total: 0,
                paymentStatus: "paid",
                isFreeOrder: true,
                deliveryOption: "download",
                date: new Date().toISOString(),
              })
              setPaymentStatus("paid")

              // Đánh dấu email đã được submit
              setEmailSubmitted(true)
            }

            // Lấy thông tin đơn hàng từ cơ sở dữ liệu
            await fetchOrderFromDB(orderCode)
          } else {
            // Nếu không có đơn hàng đã lưu, tạo đối tượng đơn hàng tối thiểu
            setOrderDetails({
              orderNumber: orderCode,
              total: 0,
              paymentStatus: "paid",
              isFreeOrder: true,
              deliveryOption: "download",
              date: new Date().toISOString(),
            })
            setPaymentStatus("paid")

            // Đánh dấu email đã được submit
            setEmailSubmitted(true)

            // Lấy thông tin đơn hàng từ cơ sở dữ liệu
            await fetchOrderFromDB(orderCode)
          }
        } else {
          // For regular orders, load from localStorage
          const orderDetailsJson = localStorage.getItem("photolab_order_details")
          if (orderDetailsJson) {
            const details = JSON.parse(orderDetailsJson)

            // Đảm bảo có ngày và tổng tiền
            const updatedDetails = {
              ...details,
              date: details.date || new Date().toISOString(),
              total: details.total || 0,
            }

            setOrderDetails(updatedDetails)

            // If coming from payment page with success flag, set status to paid immediately
            if (paymentSuccess) {
              setPaymentStatus("paid")

              // Update local storage with paid status
              const updatedDetailsWithStatus = {
                ...updatedDetails,
                paymentStatus: "paid",
              }
              setOrderDetails(updatedDetailsWithStatus)
              localStorage.setItem("photolab_order_details", JSON.stringify(updatedDetailsWithStatus))
            } else {
              // Otherwise use the status from localStorage
              setPaymentStatus(
                updatedDetails.paymentStatus === "cod_pending"
                  ? "paid"
                  : updatedDetails.paymentStatus === "paid"
                    ? "paid"
                    : "pending",
              )
            }

            // Fetch order details from database to get the most up-to-date information
            if (updatedDetails.orderNumber) {
              const dbOrder = await fetchOrderFromDB(updatedDetails.orderNumber)

              // Nếu có dữ liệu từ DB, cập nhật lại orderDetails với dữ liệu mới nhất
              if (dbOrder) {
                const mergedDetails = {
                  ...updatedDetails,
                  date: dbOrder.date || updatedDetails.date,
                  total: dbOrder.total || updatedDetails.total,
                  subtotal: dbOrder.subtotal || updatedDetails.subtotal,
                  shippingFee: dbOrder.shippingFee || updatedDetails.shippingFee,
                }
                setOrderDetails(mergedDetails)
                localStorage.setItem("photolab_order_details", JSON.stringify(mergedDetails))
              }
            }
          } else {
            // No order details found, redirect to home
            toast({
              title: "Không tìm thấy thông tin đơn hàng",
              description: "Vui lòng thực hiện đặt hàng trước khi truy cập trang này",
              variant: "destructive",
            })
            router.push("/")
            return
          }
        }
      } catch (error) {
        console.error("Error loading order details:", error)
        toast({
          title: "Lỗi tải thông tin đơn hàng",
          description: "Đã xảy ra lỗi khi tải thông tin đơn hàng",
          variant: "destructive",
        })
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    loadOrderDetails()
  }, [router, toast, isFreeOrder, orderCode, paymentSuccess])

  // Hàm xử lý tải xuống ảnh
  const handleDownload = (imageUrl: string | undefined, fileName: string) => {
    if (!imageUrl) return

    // Tạo một fetch request để lấy dữ liệu ảnh
    fetch(imageUrl)
      .then((response) => response.blob())
      .then((blob) => {
        // Tạo một URL tạm thời từ blob
        const blobUrl = URL.createObjectURL(blob)

        // Tạo một thẻ a ẩn để kích hoạt tải xuống
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()

        // Dọn dẹp
        document.body.removeChild(link)
        // Giải phóng URL tạm thời sau một khoảng thời gian ngắn
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      })
      .catch((error) => {
        console.error("Error downloading image:", error)
        toast({
          title: "Lỗi tải xuống",
          description: "Đã xảy ra lỗi khi tải ảnh xuống",
          variant: "destructive",
        })
      })
  }

  // Format price
  const formatPrice = (price: number | string | undefined) => {
    if (price === undefined || price === null) return "0 ₫"

    // Chuyển đổi sang số nếu là chuỗi
    const numPrice = typeof price === "string" ? Number.parseFloat(price) : price

    // Kiểm tra nếu không phải là số hợp lệ
    if (isNaN(numPrice)) return "0 ₫"

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(numPrice)
  }

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      // Kiểm tra nếu ngày không hợp lệ
      if (isNaN(date.getTime())) return "N/A"

      return date.toLocaleDateString("vi-VN")
    } catch (error) {
      console.error("Error formatting date:", error)
      return "N/A"
    }
  }

  const showDownloadLinks = () => {
    if (!orderDetails) return false

    // Show download links for download option or print option with includeDownloadLink
    // AND payment must be completed (except for COD)
    return (
      (orderDetails.deliveryOption === "download" ||
        (orderDetails.deliveryOption === "print" && orderDetails.includeDownloadLink === true)) &&
      (paymentStatus === "paid" || orderDetails.paymentMethod === "cod")
    )
  }

  // Gửi email xác nhận đơn hàng kèm link tải ảnh
  const sendOrderConfirmationEmail = async (orderData: any) => {
    try {
      if (!orderData) return
      const response = await fetch("/api/email/send-order-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...orderData, customerEmail: orderData.customerInfo?.email }),
      })

      if (response.ok) {
        setEmailSent(true)
        toast({
          title: "Email đã được gửi",
          description: "Chúng tôi đã gửi email xác nhận đơn hàng kèm link tải ảnh đến email của bạn.",
        })
      } else {
        console.error("Failed to send email:", await response.text())
      }
    } catch (error) {
      console.error("Error sending email:", error)
    }
  }

  // Handle email submission for free orders
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !orderCode) return

    setIsSubmittingEmail(true)

    try {
      // Update the order with the email
      await updatePaymentStatusAction(orderCode, "paid", {
        provider: "free",
        amount: 0,
        description: "Đơn hàng miễn phí",
        customerEmail: email,
      })

      // Update local order details
      const updatedOrderDetails = {
        ...orderDetails,
        customerInfo: {
          ...orderDetails?.customerInfo,
          email: email,
        },
      }

      setOrderDetails(updatedOrderDetails)
      setEmailSubmitted(true)

      // Save to localStorage
      if (orderDetails) {
        const savedOrderJson = localStorage.getItem("photolab_payment_info")
        const savedOrders = savedOrderJson ? JSON.parse(savedOrderJson) : {}
        savedOrders[orderCode] = updatedOrderDetails
        localStorage.setItem("photolab_payment_info", JSON.stringify(savedOrders))
      }

      // Lấy thông tin đơn hàng từ cơ sở dữ liệu nếu chưa có
      let orderInfo = orderFromDB
      if (!orderInfo) {
        orderInfo = await fetchOrderFromDB(orderCode)
      }

      // Gửi email xác nhận đơn hàng miễn phí kèm link tải ảnh
      try {
        // Lấy downloadUrl từ orderInfo nếu có
        const downloadUrl = orderInfo?.items?.[0]?.previewUrl || ""

        // Lấy email từ thông tin đơn hàng
        const customerEmail = orderInfo?.customerEmail || email

        // Nếu không có downloadUrl, hiển thị thông báo lỗi
        if (!downloadUrl) {
          console.error("No download URL found for order:", orderCode)
          toast({
            title: "Lỗi",
            description: "Không tìm thấy link tải ảnh cho đơn hàng này. Vui lòng liên hệ với chúng tôi để được hỗ trợ.",
            variant: "destructive",
          })
          setIsSubmittingEmail(false)
          return
        }

        const response = await fetch("/api/email/send-free-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail,
            orderNumber: orderCode,
            downloadUrl: downloadUrl,
          }),
        })

        if (response.ok) {
          setEmailSent(true)
          toast({
            title: "Cảm ơn bạn!",
            description: "Chúng tôi đã gửi link tải ảnh đến email của bạn.",
          })
        } else {
          const errorData = await response.json()
          console.error("Failed to send free order email:", errorData)
          toast({
            title: "Lỗi gửi email",
            description: errorData.message || "Đã xảy ra lỗi khi gửi email. Vui lòng thử lại sau.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error sending free order email:", error)
        toast({
          title: "Lỗi",
          description: "Đã xảy ra lỗi khi gửi email. Vui lòng thử lại sau.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting email:", error)
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi lưu email của bạn. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  // Gửi email khi thanh toán thành công và có link tải ảnh
  // useEffect(() => {
  //   if (paymentStatus === "paid" && !emailSent && showDownloadLinks() && orderDetails?.customerInfo?.email) {
  //     sendOrderConfirmationEmail(orderDetails)
  //   }
  // }, [paymentStatus, emailSent, orderDetails])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div> */}
          <LoadingSpinner size="lg" />

        </div>
        <Footer />
      </div>
    )
  }

  if (!orderDetails) {
    return null // Will redirect in useEffect
  }

  // Sử dụng orderFromDB nếu có, nếu không thì sử dụng orderDetails
  const displayItems = orderFromDB?.items || orderDetails.items || []

  // Ưu tiên sử dụng dữ liệu từ database nếu có
  const displayDate = orderFromDB?.date || orderDetails.date
  const displayTotal = orderFromDB?.total || orderDetails.total

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {isFreeOrder
                  ? "Cảm ơn bạn đã chọn sản phẩm miễn phí của chúng tôi!"
                  : paymentStatus === "paid"
                    ? "Cảm ơn bạn đã đặt hàng!"
                    : "Đơn hàng của bạn đang chờ thanh toán"}
              </h1>

              <p className="text-gray-600">
                {isFreeOrder
                  ? "Đơn hàng miễn phí của bạn đã được xác nhận. Chúng tôi đã gửi link tải ảnh đến email của bạn."
                  : paymentStatus === "paid"
                    ? "Đơn hàng của bạn đã được xác nhận và đang được xử lý."
                    : "Vui lòng hoàn tất thanh toán để đơn hàng của bạn được xử lý."}
              </p>

              {paymentStatus === "paid" && emailSent && (
                <p className="text-green-600 mt-2">
                  <CheckCircle className="inline-block h-4 w-4 mr-1" />
                  Chúng tôi đã gửi email xác nhận đơn hàng kèm link tải ảnh đến email của bạn.
                </p>
              )}
            </div>

            {orderDetails.paymentMethod === "bank" && paymentStatus === "pending" && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg inline-block">
                <Button asChild className="mt-3" variant="outline">
                  <Link href={`/payment/bank-transfer?orderCode=${orderDetails.orderNumber}`}>Tiếp tục thanh toán</Link>
                </Button>
              </div>
            )}

            {isFreeOrder ? (
              <div className="mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-800">Đơn hàng miễn phí của bạn đã được xác nhận</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Chúng tôi sẽ gửi link tải ảnh đến email{" "}
                        {orderFromDB?.customerEmail || orderDetails?.customerEmail || email} trong thời gian
                        sớm nhất.
                      </p>
                      {emailSent && (
                        <p className="text-sm text-green-700 mt-1">
                          <CheckCircle className="inline-block h-4 w-4 mr-1" />
                          Email đã được gửi. Vui lòng kiểm tra hộp thư của bạn.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hiển thị thông tin đơn hàng miễn phí */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">Thông tin đơn hàng</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-gray-200 py-4">
                    <div>
                      <h3 className="font-medium text-gray-500 mb-2">Mã đơn hàng</h3>
                      <p className="font-bold">{orderDetails.orderNumber}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-500 mb-2">Ngày đặt hàng</h3>
                      <p>{formatDate(displayDate)}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-500 mb-2">Trạng thái</h3>
                      <span className="font-medium text-green-600">Miễn phí</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-500 mb-2">Email</h3>
                      <p>{orderFromDB?.customerEmail || orderDetails?.customerEmail || email}</p>
                    </div>
                  </div>
                </div>

                {/* Hiển thị danh sách sản phẩm */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">Sản phẩm</h2>
                  <div className="space-y-4">
                    {displayItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 relative rounded overflow-hidden mr-4">
                            {item.previewUrl ? (
                              <Image
                                src={item.previewUrl || "/placeholder.svg"}
                                alt={`Ảnh ghép`}
                                fill
                                className="object-cover"
                                unoptimized={true}
                              />
                            ) : (
                              <Image
                                src="/placeholder.svg?height=100&width=100"
                                alt={`Ảnh ghép`}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">Ảnh ghép {item.template?.name}</h3>
                            <p className="text-sm text-gray-500">Ảnh chất lượng cao</p>
                          </div>
                        </div>
                        {showDownloadLinks() && (
                          <Button onClick={() => handleDownload(item.previewUrl, `photolab-${item.templateId}.jpg`)}>
                            <Download className="mr-2 h-4 w-4" />
                            Tải xuống
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="border-t border-b border-gray-200 py-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h2 className="font-medium text-gray-500 mb-2">Mã đơn hàng</h2>
                      <p className="font-bold">{orderDetails.orderNumber}</p>
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-500 mb-2">Ngày đặt hàng</h2>
                      <p>{formatDate(displayDate)}</p>
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-500 mb-2">Tổng thanh toán</h2>
                      <p className="font-bold">{formatPrice(displayTotal)}</p>
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-500 mb-2">Phương thức thanh toán</h2>
                      <p>
                        {orderDetails.paymentMethod === "bank"
                          ? "Chuyển khoản ngân hàng"
                          : "Thanh toán khi nhận hàng (COD)"}
                      </p>
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-500 mb-2">Trạng thái</h2>
                      <span
                        className={`font-medium ${paymentStatus === "paid"
                            ? "text-green-600"
                            : paymentStatus === "failed"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                      >
                        {paymentStatus === "paid"
                          ? "Đã thanh toán"
                          : paymentStatus === "failed"
                            ? "Thanh toán thất bại"
                            : "Chờ thanh toán"}
                      </span>
                    </div>
                  </div>

                  {orderDetails.deliveryOption === "print" && (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold mb-4">Thông tin giao hàng</h2>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-medium text-gray-500 mb-2">Người nhận</h3>
                            <p>{orderDetails.customerInfo.name}</p>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-500 mb-2">Số điện thoại</h3>
                            <p>{orderDetails.customerInfo.phone}</p>
                          </div>
                          <div className="md:col-span-2">
                            <h3 className="font-medium text-gray-500 mb-2">Địa chỉ giao hàng</h3>
                            <p>
                              {orderDetails.customerInfo.address}, {orderDetails.customerInfo.city}
                            </p>
                          </div>
                          {orderDetails.customerInfo.note && (
                            <div className="md:col-span-2">
                              <h3 className="font-medium text-gray-500 mb-2">Ghi chú</h3>
                              <p>{orderDetails.customerInfo.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">
                      {showDownloadLinks() ? "Tải xuống ảnh của bạn" : "Sản phẩm đã đặt"}
                    </h2>

                    <div className="space-y-4">
                      {displayItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="w-12 h-12 relative rounded overflow-hidden mr-4">
                              {item.previewUrl ? (
                                <Image
                                  src={item.previewUrl || "/placeholder.svg"}
                                  alt={`Ảnh ghép`}
                                  fill
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <Image
                                  src="/placeholder.svg?height=100&width=100"
                                  alt={`Ảnh ghép`}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">Ảnh ghép</h3>
                              {orderDetails.deliveryOption === "print" && item.quantity && item.quantity > 1 ? (
                                <p className="text-sm text-gray-500">
                                  {item.quantity} vỉ × {formatPrice(item.price)} ={" "}
                                  {formatPrice(item.price * item.quantity)}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500">Ảnh chất lượng cao</p>
                              )}
                            </div>
                          </div>
                          {showDownloadLinks() && (
                            <Button onClick={() => handleDownload(item.previewUrl, `photolab-${item.templateId}.jpg`)}>
                              <Download className="mr-2 h-4 w-4" />
                              Tải xuống
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {showDownloadLinks() && (
                      <div className="bg-blue-50 p-4 rounded-lg mt-4">
                        {/* <p className="text-sm text-blue-700">
                          <strong>Lưu ý:</strong> Link tải xuống có hiệu lực trong vòng 7 ngày. Vui lòng tải xuống và
                          lưu trữ ảnh của bạn.
                        </p> */}
                        {paymentStatus === "paid" && (
                          <p className="text-sm text-blue-700 mt-2">
                            Chúng tôi cũng đã gửi link tải ảnh đến email của bạn để bạn có thể tải xuống sau này.
                          </p>
                        )}
                      </div>
                    )}

                    {orderDetails.deliveryOption === "print" && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tạm tính</span>
                          <span>{formatPrice(orderDetails.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phí vận chuyển</span>
                          <span>{formatPrice(orderDetails.shippingFee)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-2 border-t">
                          <span>Tổng cộng</span>
                          <span>{formatPrice(displayTotal)}</span>
                        </div>
                      </div>
                    )}

                    {orderDetails.deliveryOption === "print" && (
                      <div className="bg-blue-50 p-4 rounded-lg mt-4">
                        <p className="text-sm text-blue-700">
                          <strong>Thông tin giao hàng:</strong> Đơn hàng của bạn sẽ được giao đến địa chỉ{" "}
                          {orderDetails.customerInfo.address}, {orderDetails.customerInfo.city} trong vòng 3-5 ngày làm
                          việc.
                          {orderDetails.paymentMethod === "cod" &&
                            " Vui lòng chuẩn bị tiền mặt để thanh toán khi nhận hàng."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {paymentStatus === "pending" ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <div className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-yellow-800">Đơn hàng đang chờ thanh toán</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Vui lòng hoàn tất thanh toán để đơn hàng của bạn được xử lý.
                        </p>
                        <div className="mt-3">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/payment/bank-transfer?orderCode=${orderDetails.orderNumber}`}>
                              Tiếp tục thanh toán
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-green-800">Đơn hàng đã được xác nhận</h3>
                        <p className="text-sm text-green-700 mt-1">
                          {orderDetails?.deliveryOption === "download"
                            ? "Chúng tôi sẽ gửi link tải ảnh đến email của bạn trong thời gian sớm nhất."
                            : "Đơn hàng của bạn đang được xử lý và sẽ được giao đến địa chỉ của bạn trong thời gian sớm nhất."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Về trang chủ
                </Link>
              </Button>
              <Button asChild>
                <Link href="/create">
                  Tạo ảnh mới
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
