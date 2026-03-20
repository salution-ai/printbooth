"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrderStatusUpdate } from "@/components/admin/order-status-update"
import { Tag } from "lucide-react"

interface OrderItem {
  id: number
  template_id: string
  preview_url: string | null
  price: number
  quantity: number
}

interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string | null
  customer_city: string | null
  customer_note: string | null
  subtotal: number
  shipping_fee: number
  discount_amount: number
  voucher_id: number | null
  voucher_code: string | null
  voucher_type: string | null
  voucher_value: number | null
  total: number
  payment_method: string
  delivery_option: string
  include_download: boolean
  payment_status: string
  status: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

interface OrderDetailProps {
  order: Order
}

export function OrderDetail({ order }: OrderDetailProps) {
  const [showFullNote, setShowFullNote] = useState(false)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Chuyển đổi sang múi giờ Việt Nam (UTC+7)
    date.setHours(date.getHours() + 7)
    return date.toLocaleString("vi-VN")
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "processing":
        return "default"
      case "shipped":
        return "default"
      case "delivered":
        return "success"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Get payment status badge variant
  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "completed":
        return "success"
      case "failed":
        return "destructive"
      case "cod_pending":
        return "warning"
      default:
        return "outline"
    }
  }

  // Get payment status text
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán"
      case "completed":
        return "Đã thanh toán"
      case "failed":
        return "Thanh toán thất bại"
      case "cod_pending":
        return "COD - Chờ thanh toán"
      default:
        return status
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ xử lý"
      case "processing":
        return "Đang xử lý"
      case "shipped":
        return "Đang giao hàng"
      case "delivered":
        return "Đã giao hàng"
      case "cancelled":
        return "Đã hủy"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Đơn hàng #{order.order_number}</h1>
          <p className="text-gray-500">Ngày đặt hàng: {formatDate(order.created_at)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
            {getPaymentStatusText(order.payment_status)}
          </Badge>
          <Badge variant={getStatusBadgeVariant(order.status)}>{getStatusText(order.status)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Sản phẩm</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="w-20 h-20 relative rounded overflow-hidden flex-shrink-0">
                      {item.preview_url ? (
                        <Image
                          src={item.preview_url || "/placeholder.svg"}
                          alt={`Ảnh ghép ${item.template_id}`}
                          fill
                          className="object-cover"
                          unoptimized={true}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Ảnh ghép {item.template_id}</h3>
                        {order.delivery_option === "print" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            In ấn
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            Tải xuống
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {order.delivery_option === "print"
                          ? `${item.quantity} vỉ ảnh chất lượng cao`
                          : "Ảnh ghép chất lượng cao"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {order.delivery_option === "print"
                          ? `${formatCurrency(item.price)} × ${item.quantity}`
                          : formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Thông tin khách hàng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-500">Thông tin liên hệ</h3>
                  <ul className="mt-2 space-y-1">
                    <li>
                      <span className="font-medium">Họ tên:</span> {order.customer_name}
                    </li>
                    <li>
                      <span className="font-medium">Email:</span> {order.customer_email}
                    </li>
                    <li>
                      <span className="font-medium">Số điện thoại:</span> {order.customer_phone}
                    </li>
                  </ul>
                </div>

                {order.delivery_option === "print" && (
                  <div>
                    <h3 className="font-medium text-gray-500">Địa chỉ giao hàng</h3>
                    <ul className="mt-2 space-y-1">
                      <li>{order.customer_address}</li>
                      <li>{order.customer_city}</li>
                    </ul>
                  </div>
                )}
              </div>

              {order.customer_note && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-500">Ghi chú</h3>
                  <p className="mt-1 text-sm">
                    {showFullNote || order.customer_note.length <= 100
                      ? order.customer_note
                      : `${order.customer_note.substring(0, 100)}...`}
                    {order.customer_note.length > 100 && (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => setShowFullNote(!showFullNote)}
                      >
                        {showFullNote ? "Thu gọn" : "Xem thêm"}
                      </Button>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Thông tin đơn hàng</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Phương thức thanh toán</span>
                  <span className="font-medium">
                    {order.payment_method === "bank" ? "Chuyển khoản ngân hàng" : "Thanh toán khi nhận hàng (COD)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hình thức nhận hàng</span>
                  <span className="font-medium">{order.delivery_option === "download" ? "Tải xuống" : "In ảnh"}</span>
                </div>
                {order.delivery_option === "print" && (
                  <div className="flex justify-between">
                    <span>Bao gồm link tải</span>
                    <span className="font-medium">{order.include_download ? "Có" : "Không"}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Tóm tắt đơn hàng</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tạm tính</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Phí vận chuyển</span>
                  <span>{formatCurrency(order.shipping_fee)}</span>
                </div>

                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <div className="flex items-center">
                      <span>Giảm giá</span>
                      {order.voucher_code && (
                        <div className="ml-2 flex items-center bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded">
                          <Tag className="h-3 w-3 mr-1" />
                          {order.voucher_code}
                          {order.voucher_type && (
                            <span className="ml-1">
                              (
                              {order.voucher_type === "PERCENTAGE"
                                ? `${order.voucher_value}%`
                                : formatCurrency(order.voucher_value || 0)}
                              )
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <OrderStatusUpdate orderId={order.id} currentStatus={order.status} />
        </div>
      </div>
    </div>
  )
}
