"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Home, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { processVnpayReturn, getPendingOrder, clearPendingOrder } from "@/services/payment-service"

export default function VnpayReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean
    orderCode?: string
    transactionId?: string
    amount?: number
    message: string
  } | null>(null)

  useEffect(() => {
    const processPaymentResult = async () => {
      setIsLoading(true)
      try {
        // Xử lý kết quả thanh toán từ VNPay
        const result = processVnpayReturn(searchParams)
        setPaymentResult(result)

        if (result.success) {
          // Lấy thông tin đơn hàng đã lưu trước khi thanh toán
          const pendingOrder = getPendingOrder()

          if (pendingOrder) {
            // Lưu thông tin đơn hàng vào localStorage để hiển thị ở trang thank-you
            localStorage.setItem("photolab_order_details", JSON.stringify(pendingOrder))

            // Xóa thông tin đơn hàng tạm thời
            clearPendingOrder()

            // Xóa thông tin giỏ hàng
            localStorage.removeItem("photolab_checkout_info")

            // Chuyển hướng đến trang cảm ơn sau 3 giây
            setTimeout(() => {
              router.push("/thank-you")
            }, 3000)
          } else {
            toast({
              title: "Lỗi xử lý đơn hàng",
              description: "Không tìm thấy thông tin đơn hàng",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error("Error processing payment result:", error)
        toast({
          title: "Lỗi xử lý thanh toán",
          description: "Đã xảy ra lỗi khi xử lý kết quả thanh toán",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    processPaymentResult()
  }, [router, searchParams, toast])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Đang xử lý kết quả thanh toán...</p>
              </div>
            ) : paymentResult?.success ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
                <p className="text-gray-600 mb-6">
                  Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đã được xác nhận và đang được xử lý.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Bạn sẽ được chuyển hướng đến trang chi tiết đơn hàng trong vài giây...
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" />
                      Về trang chủ
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/thank-you">
                      Xem chi tiết đơn hàng
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Thanh toán thất bại</h1>
                <p className="text-gray-600 mb-6">
                  {paymentResult?.message || "Đã xảy ra lỗi trong quá trình thanh toán."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" />
                      Về trang chủ
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/checkout">
                      Thử lại
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
