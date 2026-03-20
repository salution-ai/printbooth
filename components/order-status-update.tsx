"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"

interface OrderStatusUpdateProps {
  orderId: string
  currentOrderStatus: string
  currentPaymentStatus: string
  onStatusUpdated?: () => void
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
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderStatus,
          paymentStatus,
          note,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Cập nhật thành công",
          description: "Trạng thái đơn hàng đã được cập nhật",
        })
        setNote("")
        if (onStatusUpdated) {
          onStatusUpdated()
        }
      } else {
        throw new Error(data.error || "Failed to update order status")
      }
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái đơn hàng",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cập nhật trạng thái đơn hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Trạng thái đơn hàng</h3>
              <RadioGroup
                value={orderStatus}
                onValueChange={setOrderStatus}
                className="grid grid-cols-1 md:grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="order-pending" />
                  <Label htmlFor="order-pending" className="cursor-pointer">
                    Chờ xử lý
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="processing" id="order-processing" />
                  <Label htmlFor="order-processing" className="cursor-pointer">
                    Đang xử lý
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shipped" id="order-shipped" />
                  <Label htmlFor="order-shipped" className="cursor-pointer">
                    Đang giao hàng
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivered" id="order-delivered" />
                  <Label htmlFor="order-delivered" className="cursor-pointer">
                    Đã giao hàng
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="order-completed" />
                  <Label htmlFor="order-completed" className="cursor-pointer">
                    Hoàn thành
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cancelled" id="order-cancelled" />
                  <Label htmlFor="order-cancelled" className="cursor-pointer">
                    Đã hủy
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Trạng thái thanh toán</h3>
              <RadioGroup
                value={paymentStatus}
                onValueChange={setPaymentStatus}
                className="grid grid-cols-1 md:grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="payment-pending" />
                  <Label htmlFor="payment-pending" className="cursor-pointer">
                    Chờ thanh toán
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="payment-paid" />
                  <Label htmlFor="payment-paid" className="cursor-pointer">
                    Đã thanh toán
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cod_pending" id="payment-cod" />
                  <Label htmlFor="payment-cod" className="cursor-pointer">
                    COD - Chờ thanh toán
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="failed" id="payment-failed" />
                  <Label htmlFor="payment-failed" className="cursor-pointer">
                    Thanh toán thất bại
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="note" className="text-sm font-medium">
                Ghi chú
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú về việc cập nhật trạng thái (không bắt buộc)"
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {loading ? "Đang cập nhật..." : "Cập nhật trạng thái"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
