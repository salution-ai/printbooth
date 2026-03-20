"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// Định nghĩa các trạng thái đơn hàng hợp lệ
const ORDER_STATUSES = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipped", label: "Đã gửi hàng" },
  { value: "delivered", label: "Đã giao hàng" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
]

const PAYMENT_STATUSES = [
  { value: "pending", label: "Chờ thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "cod_pending", label: "COD - Chờ thanh toán" },
  { value: "failed", label: "Thanh toán thất bại" },
]

interface OrderStatusUpdateProps {
  orderId: string
  currentOrderStatus: string
  currentPaymentStatus: string
  onStatusUpdated: () => void
}

export function OrderStatusUpdate({
  orderId,
  currentOrderStatus,
  currentPaymentStatus,
  onStatusUpdated,
}: OrderStatusUpdateProps) {
  const [orderStatus, setOrderStatus] = useState(currentOrderStatus)
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus)
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Kiểm tra xem có thay đổi nào không
      if (orderStatus === currentOrderStatus && paymentStatus === currentPaymentStatus) {
        toast({
          title: "Không có thay đổi",
          description: "Bạn chưa thay đổi trạng thái nào.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Kiểm tra note
      if (!note.trim()) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng nhập ghi chú khi thay đổi trạng thái.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderStatus: orderStatus !== currentOrderStatus ? orderStatus : undefined,
          paymentStatus: paymentStatus !== currentPaymentStatus ? paymentStatus : undefined,
          note,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi cập nhật trạng thái")
      }

      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái đơn hàng đã được cập nhật.",
      })

      // Reset note field
      setNote("")

      // Callback to refresh order data
      onStatusUpdated()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Cập nhật thất bại",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật trạng thái",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderStatus">Trạng thái đơn hàng</Label>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger id="orderStatus">
                <SelectValue placeholder="Chọn trạng thái đơn hàng" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentStatus">Trạng thái thanh toán</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger id="paymentStatus">
                <SelectValue placeholder="Chọn trạng thái thanh toán" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú (bắt buộc)</Label>
            <Textarea
              id="note"
              placeholder="Nhập ghi chú khi cập nhật trạng thái"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Đang cập nhật..." : "Cập nhật trạng thái"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
