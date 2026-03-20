"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, Check, ArrowRight, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { getPendingOrder, clearPendingOrder, generateVietQRCode } from "@/services/payment-service"
import { createOrderAction } from "@/app/actions/order-actions"
import Loading from "@/components/loading"

export default function BankTransferContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending")
  const [emailSent, setEmailSent] = useState(false)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const orderCreatedRef = useRef<boolean>(false)
  const paymentUpdatedRef = useRef<boolean>(false)

  // Thông tin tài khoản ngân hàng
  const bankInfo = {
    bankName: "OCB - Ngân hàng thương mại cổ phần Phương Đông",
    accountNumber: "0160101888866666",
    accountName: "Nghiem Thi Lien",
    branch: "Hà Nội",
  }

  useEffect(() => {
    const loadOrderDetails = async () => {
      setIsLoading(true)
      try {
        // Lấy thông tin đơn hàng đã lưu trước khi thanh toán
        const pendingOrder = getPendingOrder()
        const orderCode = searchParams.get("orderCode")

        if (pendingOrder && orderCode) {
          setOrderDetails(pendingOrder)

          // Tạo mã QR thanh toán
          const qrUrl = generateVietQRCode({
            orderCode: pendingOrder.orderNumber,
            amount: pendingOrder.total,
            description: `${pendingOrder.orderNumber}`,
          })
          setQrCodeUrl(qrUrl)

          // Tạo đơn hàng trong database nếu chưa tạo
          if (!orderCreatedRef.current) {
            try {
              // Đảm bảo imageIds là một mảng JSON hợp lệ
              const processedItems = pendingOrder.items.map((item: any) => ({
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
                ...pendingOrder,
                items: processedItems,
              }

              const result = await createOrderAction(orderDataToCreate)
              if (result.success) {
                console.log("Order created in database:", result.orderNumber)
                orderCreatedRef.current = true
              } else {
                console.error("Failed to create order in database:", result.message)
              }
            } catch (error) {
              console.error("Error creating order:", error)
            }
          }

          // Bắt đầu kiểm tra trạng thái thanh toán
          startPaymentCheck(pendingOrder.orderNumber)
        } else {
          toast({
            title: "Lỗi xử lý đơn hàng",
            description: "Không tìm thấy thông tin đơn hàng",
            variant: "destructive",
          })
          router.push("/checkout")
        }
      } catch (error) {
        console.error("Error loading order details:", error)
        toast({
          title: "Lỗi tải thông tin đơn hàng",
          description: "Đã xảy ra lỗi khi tải thông tin đơn hàng",
          variant: "destructive",
        })
        router.push("/checkout")
      } finally {
        setIsLoading(false)
      }
    }

    loadOrderDetails()

    // Cleanup function
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [router, searchParams, toast])

  // Hàm bắt đầu kiểm tra trạng thái thanh toán
  const startPaymentCheck = (orderCode: string) => {
    // Kiểm tra ngay lập tức
    // checkPayment(orderCode)
    setTimeout(() => {
      // Kiểm tra lại sau 3 giây
      checkPayment(orderCode)
    }, 3000)

    // Thiết lập kiểm tra định kỳ mỗi 10 giây
    checkIntervalRef.current = setInterval(() => {
      checkPayment(orderCode)
    }, 3000) // Giảm thời gian polling xuống 10 giây vì đang gọi API nội bộ
  }

  // Hàm lấy thông tin đơn hàng từ database
  const fetchOrderFromDatabase = async (orderNumber: string) => {
    try {
      console.log("Fetching order from DB for email:", orderNumber)
      const response = await fetch(`/api/orders/get-by-number?orderNumber=${orderNumber}`)
      if (response.ok) {
        console.log("Response from DB:", response)
        const data = await response.json()
        if (data.success && data.order) {
          console.log("Order fetched from DB for email:", data.order)
          return data.order
        }
      }
      console.error("Failed to fetch order from DB:", await response.text())
      return null
    } catch (error) {
      console.error("Error fetching order from DB for email:", error)
      return null
    }
  }

  // Hàm gửi email xác nhận đơn hàng
  const sendOrderConfirmationEmail = async (orderData: any) => {
    try {
      if (!orderData || !orderData.customerEmail) {
        console.error("Missing order data or customer email for sending email")
        return false
      }

      // Lấy thông tin đơn hàng đầy đủ từ database để có thông tin items
      const orderFromDB = await fetchOrderFromDatabase(orderData.orderNumber)

      // Sử dụng dữ liệu từ database nếu có, nếu không thì sử dụng dữ liệu hiện tại
      const emailData = orderFromDB || orderData

      // Đảm bảo có customerEmail
      emailData.customerEmail = orderData.customerEmail

      console.log("Sending email with data:", emailData)

      const response = await fetch("/api/email/send-order-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        console.error("Failed to send order confirmation email:", await response.text())
        return false
      }

      console.log("Order confirmation email sent successfully")
      return true
    } catch (error) {
      console.error("Error sending order confirmation email:", error)
      return false
    }
  }

  const showDownloadLinks = () => {
    if (!orderDetails) return false

    // Show download links for download option or print option with includeDownloadLink
    // AND payment must be completed (except for COD)
    return (
      (orderDetails.deliveryOption === "download" ||
        (orderDetails.deliveryOption === "print" && orderDetails.includeDownloadLink === true)) &&
      (orderDetails.paymentStatus === "paid" || orderDetails.paymentMethod === "cod")
    )
  }

  // Cập nhật hàm checkPayment để sử dụng API nội bộ thay vì Casso
  const checkPayment = async (orderCode: string) => {
    setIsCheckingPayment(true)
    try {
      // Gọi API nội bộ để kiểm tra trạng thái thanh toán
      const response = await fetch(`/api/payment/check-status?orderNumber=${orderCode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error checking payment status:", errorData)
        return
      }

      const result = await response.json()

      if (result.success && result.paid) {
        // Thanh toán thành công
        setPaymentStatus("success")

        // Dừng kiểm tra định kỳ
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
          checkIntervalRef.current = null
        }

        // Lấy thông tin đơn hàng từ localStorage hoặc từ database nếu cần
        let updatedOrderDetails = orderDetails

        // Nếu orderDetails là null, thử lấy từ localStorage
        if (!updatedOrderDetails) {
          const pendingOrder = getPendingOrder()
          if (pendingOrder) {
            updatedOrderDetails = pendingOrder
            setOrderDetails(pendingOrder)
          } else {
            // Nếu vẫn không có, tạo một đối tượng tối thiểu với orderNumber
            updatedOrderDetails = {
              orderNumber: orderCode,
              paymentStatus: "paid",
              transactionInfo: result.transactionInfo,
            }
          }
        }

        // Cập nhật trạng thái đơn hàng
        if (updatedOrderDetails) {
          updatedOrderDetails = {
            ...updatedOrderDetails,
            paymentStatus: "paid",
            transactionInfo: result.transactionInfo,
          }

          // Lưu thông tin đơn hàng vào localStorage để hiển thị ở trang thank-you
          localStorage.setItem("photolab_order_details", JSON.stringify(updatedOrderDetails))

          // Xóa thông tin đơn hàng tạm thời
          clearPendingOrder()

          // Xóa thông tin giỏ hàng
          localStorage.removeItem("photolab_checkout_info")

          // Hiển thị thông báo
          toast({
            title: "Thanh toán thành công",
            description: `Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đang được xử lý.`,
          })

          // Chuyển hướng đến trang cảm ơn sau 3 giây
          setTimeout(() => {
            router.push("/thank-you")
          }, 3000)
        }
      } else if (!result.success) {
        // Có lỗi khi kiểm tra
        console.log("Lỗi kiểm tra thanh toán:", result.message)
      }
    } catch (error) {
      console.error("Error checking payment status:", error)
      toast({
        title: "Lỗi kiểm tra thanh toán",
        description: "Đã xảy ra lỗi khi kiểm tra trạng thái thanh toán",
        variant: "destructive",
      })
    } finally {
      setIsCheckingPayment(false)
    }
  }

  // Copy text to clipboard
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied({ ...copied, [key]: true })
        setTimeout(() => {
          setCopied({ ...copied, [key]: false })
        }, 2000)
      },
      (err) => {
        console.error("Could not copy text: ", err)
      },
    )
  }

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Kiểm tra thủ công
  const handleManualCheck = () => {
    if (orderDetails) {
      checkPayment(orderDetails.orderNumber)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        {/* <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div> */}
        <Loading />
      </div>
    )
  }

  if (!orderDetails) {
    return null // Will redirect in useEffect
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Thanh toán đơn hàng</h1>
            <p className="text-gray-600">Vui lòng quét mã QR bên dưới để thanh toán đơn hàng của bạn</p>
          </div>

          {paymentStatus === "success" ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Thanh toán thành công!</h2>
              <p className="text-gray-600 mb-6">Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đang được xử lý.</p>
              <p className="text-sm text-gray-500 mb-6">
                Bạn sẽ được chuyển hướng đến trang chi tiết đơn hàng trong vài giây...
              </p>
              <Button asChild>
                <Link href="/thank-you">
                  Xem chi tiết đơn hàng
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold">Thông tin tài khoản</h2>
                  <div className="w-12 h-12 relative">
                    <Image src="/ocb-logo-display.png" alt="Vietcombank" fill className="object-contain" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Ngân hàng</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="font-medium">{bankInfo.bankName}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Số tài khoản</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="font-medium">{bankInfo.accountNumber}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => copyToClipboard(bankInfo.accountNumber, "accountNumber")}
                      >
                        {copied.accountNumber ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Chủ tài khoản</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="font-medium">{bankInfo.accountName}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => copyToClipboard(bankInfo.accountName, "accountName")}
                      >
                        {copied.accountName ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Chi nhánh</p>
                    <p className="font-medium">{bankInfo.branch}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="font-bold mb-4">Thông tin thanh toán</h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Số tiền cần thanh toán</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="font-bold text-lg text-primary">{formatPrice(orderDetails.total)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => copyToClipboard(orderDetails.total.toString(), "amount")}
                      >
                        {copied.amount ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Nội dung chuyển khoản</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="font-medium">{orderDetails.orderNumber}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() =>
                          copyToClipboard(`${orderDetails.orderNumber} ${orderDetails.customerInfo.name}`, "content")
                        }
                      >
                        {copied.content ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border">
                <h3 className="font-medium mb-4">Quét mã QR để thanh toán</h3>
                {qrCodeUrl ? (
                  <div className="relative w-64 h-64 mb-4">
                    <Image
                      src={qrCodeUrl || "/placeholder.svg"}
                      alt="QR Code thanh toán"
                      fill
                      className="object-contain"
                      unoptimized={true}
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-gray-100 flex items-center justify-center mb-4">
                    <p className="text-gray-500">Đang tạo mã QR...</p>
                  </div>
                )}
                <p className="text-sm text-gray-500 text-center mb-4">
                  Sử dụng ứng dụng ngân hàng để quét mã QR và thanh toán
                </p>
                <Button
                  onClick={handleManualCheck}
                  disabled={isCheckingPayment}
                  variant="outline"
                  className="flex items-center"
                >
                  {isCheckingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tôi đã thanh toán
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Lưu ý:</strong> Hệ thống sẽ tự động kiểm tra trạng thái thanh toán của bạn. Sau khi thanh toán
                  thành công, bạn sẽ được chuyển hướng đến trang chi tiết đơn hàng.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button asChild variant="outline">
                  <Link href="/">Về trang chủ</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/checkout">Quay lại thanh toán</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
