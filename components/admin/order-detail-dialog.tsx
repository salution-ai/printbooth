"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { OrderStatusUpdate } from "@/components/admin/order-status-update"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Phone, Mail, MapPin, Calendar, CreditCard, Package, ShoppingBag, FileText, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Order, OrderStatusHistory, OrderTransaction } from "@/services/order-service"
import { Button } from "@/components/ui/button"

interface OrderDetailDialogProps {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({ orderId, open, onOpenChange }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const { toast } = useToast()

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails(orderId)
    } else {
      setOrder(null)
    }
  }, [open, orderId])

  const fetchOrderDetails = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch order details")
      }
      const data = await response.json()
      if (data.success && data.order) {
        setOrder(data.order)
      } else {
        throw new Error(data.error || "Failed to fetch order details")
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin chi tiết đơn hàng",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = () => {
    if (orderId) {
      fetchOrderDetails(orderId)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  // Thay đổi hàm formatDate để sử dụng múi giờ UTC+7 (Việt Nam)
  const formatDate = (date: Date) => {
    // Chuyển đổi sang múi giờ Việt Nam (UTC+7)
    const vietnamDate = new Date(date)
    vietnamDate.setHours(vietnamDate.getHours() + 7)
    return format(vietnamDate, "dd/MM/yyyy HH:mm", { locale: vi })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Chờ xử lý
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Đang xử lý
          </Badge>
        )
      case "shipped":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Đang giao hàng
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Đã giao hàng
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Hoàn thành
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Đã hủy
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Chờ thanh toán
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Đã thanh toán
          </Badge>
        )
      case "cod_pending":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            COD - Chờ thanh toán
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Thanh toán thất bại
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "bank":
        return "Chuyển khoản ngân hàng"
      case "cod":
        return "Thanh toán khi nhận hàng (COD)"
      default:
        return method
    }
  }

  const getDeliveryOptionText = (option: string) => {
    switch (option) {
      case "download":
        return "Tải xuống"
      case "print":
        return "In ấn và giao hàng"
      default:
        return option
    }
  }

  // Kiểm tra xem đơn hàng có ảnh loại "In" không
  const hasPrintImages = () => {
    if (!order || !order.items) return false
    return order.deliveryOption === "print" || order.items.some((item) => item.deliveryOption === "print")
  }

  // Tải xuống tất cả ảnh loại "In"
  const downloadPrintImages = async () => {
    if (!order) return

    // Tạo danh sách các ảnh loại "In" cần tải
    const printImages: { url: string; itemId: string | number }[] = []

    // Thêm ảnh preview nếu có và thuộc loại "In"
    order.items?.forEach((item) => {
      if (item.previewUrl && (order.deliveryOption === "print" || item.deliveryOption === "print")) {
        printImages.push({ url: item.previewUrl, itemId: item.id })
      }
    })

    if (printImages.length === 0) {
      toast({
        title: "Không có ảnh",
        description: "Đơn hàng này không có ảnh in nào để tải xuống",
        variant: "destructive",
      })
      return
    }

    // Hiển thị thông báo đang tải
    toast({
      title: "Đang tải ảnh",
      description: `Đang tải ${printImages.length} ảnh, vui lòng đợi...`,
    })

    try {
      // Tải từng ảnh một
      for (let i = 0; i < printImages.length; i++) {
        const { url, itemId } = printImages[i]
        await downloadSingleImage(url, `${order.orderNumber}_${itemId}`)
      }

      toast({
        title: "Tải ảnh thành công",
        description: `Đã tải xuống ${printImages.length} ảnh`,
      })
    } catch (error) {
      console.error("Error downloading images:", error)
      toast({
        title: "Lỗi tải ảnh",
        description: "Có lỗi xảy ra khi tải ảnh, vui lòng thử lại sau",
        variant: "destructive",
      })
    }
  }

  // Tải xuống một ảnh cụ thể
  const downloadSingleImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      // Tạo tên file với phần mở rộng phù hợp
      const fullFileName = `${fileName}.${getFileExtension(imageUrl)}`

      // Tạo link tải xuống và click
      const downloadLink = document.createElement("a")
      downloadLink.href = URL.createObjectURL(blob)
      downloadLink.download = fullFileName
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      // Đợi một chút giữa các lần tải để tránh trình duyệt block
      await new Promise((resolve) => setTimeout(resolve, 500))

      return true
    } catch (error) {
      console.error("Error downloading image:", error)
      throw error
    }
  }

  // Helper function để lấy phần mở rộng của file từ URL
  const getFileExtension = (url: string): string => {
    // Loại bỏ query parameters
    const baseUrl = url.split("?")[0]
    // Lấy phần mở rộng
    const extension = baseUrl.split(".").pop()?.toLowerCase() || "jpg"
    return extension
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Chi tiết đơn hàng {order?.orderNumber}</span>
            <div className="flex items-center gap-2 mr-5">
              {order && (
                <>
                  {hasPrintImages() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={downloadPrintImages}
                    >
                      <Download className="h-4 w-4" />
                      <span>Tải ảnh in</span>
                    </Button>
                  )}
                  {getStatusBadge(order.orderStatus)}
                  {getPaymentStatusBadge(order.paymentStatus)}
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : order ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-3 gap-1 sm:gap-0 sm:grid-cols-3">
              <TabsTrigger value="details" className="text-xs sm:text-base">
                Thông tin đơn hàng
              </TabsTrigger>
              <TabsTrigger value="update" className="text-xs sm:text-base">
                Cập nhật trạng thái
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-base">
                Lịch sử
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(90vh-10rem)]">
                <div className="space-y-6 p-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Thông tin khách hàng */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Thông tin khách hàng</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Mail className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div>{order.customerEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div>{order.customerPhone}</div>
                          </div>
                        </div>
                        {(order.customerAddress || order.customerCity) && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                            <div>
                              <div>
                                {order.customerAddress}
                                {order.customerAddress && order.customerCity && ", "}
                                {order.customerCity}
                              </div>
                            </div>
                          </div>
                        )}
                        {order.customerNote && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-1 text-gray-500" />
                            <div>
                              <div className="text-sm text-gray-500">Ghi chú:</div>
                              <div>{order.customerNote}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Thông tin đơn hàng */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Thông tin đơn hàng</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-start gap-2">
                          <ShoppingBag className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-500">Mã đơn hàng:</div>
                            <div className="font-medium">{order.orderNumber}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-500">Ngày đặt hàng:</div>
                            <div>{formatDate(order.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-500">Phương thức thanh toán:</div>
                            <div>{getPaymentMethodText(order.paymentMethod)}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Package className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-500">Phương thức giao hàng:</div>
                            <div>{getDeliveryOptionText(order.deliveryOption)}</div>
                          </div>
                        </div>
                        {order.deliveryOption === "print" && (
                          <div className="flex items-start gap-2">
                            <Download className="h-4 w-4 mt-1 text-gray-500" />
                            <div>
                              <div className="text-sm text-gray-500">Bao gồm link tải:</div>
                              <div>{order.includeDownload ? "Có" : "Không"}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sản phẩm */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sản phẩm</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-6">
                          {order.items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4">
                              <div className="flex flex-col md:flex-row gap-4">
                                <div className="w-full md:w-1/4">
                                  {item.template?.image && (
                                    <div className="relative aspect-square rounded-md overflow-hidden">
                                      <Image
                                        src={item.template.image || "/placeholder.svg"}
                                        alt={item.template?.name || "Template"}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-medium text-lg">{item.template?.name || "Template"}</h3>
                                    {order.deliveryOption === "print" || item.deliveryOption === "print" ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        In ấn
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Tải xuống
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <div className="text-sm text-gray-500">Giá:</div>
                                      <div className="font-medium">{formatCurrency(item.price)}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-500">Số lượng:</div>
                                      <div>{item.quantity}</div>
                                    </div>
                                  </div>

                                  {/* Hiển thị ảnh preview */}
                                  {item.previewUrl && (
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                                        <span>Ảnh preview:</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex items-center gap-1 h-7 px-2"
                                          onClick={() =>
                                            downloadSingleImage(item.previewUrl!, `${order.orderNumber}_${item.id}`)
                                          }
                                        >
                                          <Download className="h-3 w-3" />
                                          <span className="text-xs">Tải xuống</span>
                                        </Button>
                                      </div>
                                      <div className="relative h-40 rounded-md overflow-hidden">
                                        <Image
                                          src={item.previewUrl || "/placeholder.svg"}
                                          alt="Preview"
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Hiển thị các ảnh đã upload */}
                                  {/* {item.imageUrls && item.imageUrls.length > 0 && (
                                    <div>
                                      <div className="text-sm text-gray-500 mb-2">Ảnh đã upload:</div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {item.imageUrls.map((url, index) => (
                                          <div
                                            key={index}
                                            className="relative aspect-square rounded-md overflow-hidden border"
                                          >
                                            <Image
                                              src={url || "/placeholder.svg"}
                                              alt={`Uploaded image ${index + 1}`}
                                              fill
                                              className="object-cover"
                                            />
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-50 transition-all group"
                                            >
                                              <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )} */}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">Không có sản phẩm nào</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tổng tiền */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tổng tiền</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Tạm tính:</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.voucherCode && (
                          <div className="flex justify-between text-green-600">
                            <span className="flex items-center">
                              Mã giảm giá ({order.voucherCode})
                              {order.voucherType && (
                                <span className="ml-1 text-xs">
                                  (
                                  {order.voucherType === "PERCENTAGE"
                                    ? `${order.voucherValue}%`
                                    : formatCurrency(order.voucherValue || 0)}
                                  )
                                </span>
                              )}
                              :
                            </span>
                            <span>-{formatCurrency(order.discountAmount || 0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Phí vận chuyển:</span>
                          <span>{formatCurrency(order.shippingFee)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-medium text-lg">
                          <span>Tổng cộng:</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lịch sử giao dịch */}
                  {order.transactions && order.transactions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Lịch sử giao dịch</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {order.transactions.map((transaction: OrderTransaction) => (
                            <div key={transaction.id} className="border rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm text-gray-500">Mã giao dịch:</div>
                                  <div className="font-medium">{transaction.transactionId || "N/A"}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500">Nhà cung cấp:</div>
                                  <div>{transaction.provider}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500">Số tiền:</div>
                                  <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500">Trạng thái:</div>
                                  <div>
                                    {transaction.status === "success" ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Thành công
                                      </Badge>
                                    ) : transaction.status === "pending" ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-50 text-yellow-700 border-yellow-200"
                                      >
                                        Đang xử lý
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        Thất bại
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500">Thời gian:</div>
                                  <div>{formatDate(transaction.createdAt)}</div>
                                </div>
                              </div>
                              {transaction.transactionData && (
                                <div className="mt-4">
                                  <div className="text-sm text-gray-500 mb-1">Dữ liệu giao dịch:</div>
                                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(transaction.transactionData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="update" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(90vh-10rem)]">
                <div className="p-1">
                  <OrderStatusUpdate
                    orderId={order.id}
                    currentOrderStatus={order.orderStatus}
                    currentPaymentStatus={order.paymentStatus}
                    onStatusUpdated={handleStatusUpdate}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(90vh-10rem)]">
                <div className="p-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lịch sử trạng thái đơn hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {order.statusHistory && order.statusHistory.length > 0 ? (
                        <div className="space-y-4">
                          {order.statusHistory.map((history: OrderStatusHistory) => (
                            <div key={history.id} className="border-l-2 border-gray-200 pl-4 pb-4 relative">
                              <div className="absolute w-3 h-3 bg-gray-200 rounded-full -left-[7px] top-1"></div>
                              <div className="flex flex-col gap-1">
                                <div className="text-sm text-gray-500">{formatDate(history.createdAt)}</div>
                                <div className="font-medium">{getStatusBadge(history.status)}</div>
                                {history.note && <div className="mt-1">{history.note}</div>}
                                {history.createdBy && (
                                  <div className="text-sm text-gray-500">Cập nhật bởi: {history.createdBy}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">Không có lịch sử trạng thái</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-12 text-gray-500">Không tìm thấy thông tin đơn hàng</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
