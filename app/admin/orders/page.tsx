"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import type { Order } from "@/services/order-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { OrderDetailDialog } from "@/components/admin/order-detail-dialog"
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    orderNumber: "",
    customerEmail: "",
    paymentStatus: "",
    orderStatus: "",
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const { toast } = useToast()
  const limit = 10

  useEffect(() => {
    fetchOrders()
  }, [currentPage, filters])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.append("page", currentPage.toString())
      queryParams.append("limit", limit.toString())

      if (filters.orderNumber) queryParams.append("orderNumber", filters.orderNumber)
      if (filters.customerEmail) queryParams.append("customerEmail", filters.customerEmail)
      if (filters.paymentStatus && filters.paymentStatus !== "all")
        queryParams.append("paymentStatus", filters.paymentStatus)
      if (filters.orderStatus && filters.orderStatus !== "all") queryParams.append("orderStatus", filters.orderStatus)

      const response = await fetch(`/api/orders?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch orders")
      }

      const data = await response.json()
      setOrders(data.orders)
      setTotalOrders(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đơn hàng",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    // Parse search query to determine if it's an order number or email
    if (searchQuery.includes("@")) {
      setFilters({ ...filters, customerEmail: searchQuery, orderNumber: "" })
    } else {
      setFilters({ ...filters, orderNumber: searchQuery, customerEmail: "" })
    }
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      orderNumber: "",
      customerEmail: "",
      paymentStatus: "",
      orderStatus: "",
    })
    setSearchQuery("")
    setCurrentPage(1)
  }

  const openOrderDetail = (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsDetailDialogOpen(true)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi })
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Input
              placeholder="Tìm theo mã đơn hàng hoặc email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pr-8"
            />
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-1 block">Trạng thái đơn hàng</label>
          <Select value={filters.orderStatus} onValueChange={(value) => handleFilterChange("orderStatus", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ xử lý</SelectItem>
              <SelectItem value="processing">Đang xử lý</SelectItem>
              <SelectItem value="shipped">Đang giao hàng</SelectItem>
              <SelectItem value="delivered">Đã giao hàng</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Trạng thái thanh toán</label>
          <Select value={filters.paymentStatus} onValueChange={(value) => handleFilterChange("paymentStatus", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ thanh toán</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
              <SelectItem value="cod_pending">COD - Chờ thanh toán</SelectItem>
              <SelectItem value="failed">Thanh toán thất bại</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn hàng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  Không có đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p>{order.customerName}</p>
                      <p className="text-sm text-gray-500">{order.customerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>{getStatusBadge(order.orderStatus)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openOrderDetail(order.id)} title="Xem chi tiết">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
        <div className="text-sm text-gray-500">
          Hiển thị {orders.length} / {totalOrders} đơn hàng
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Trước
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Hiển thị 5 trang xung quanh trang hiện tại
              let pageToShow: number
              if (totalPages <= 5) {
                // Nếu tổng số trang <= 5, hiển thị tất cả các trang
                pageToShow = i + 1
              } else if (currentPage <= 3) {
                // Nếu trang hiện tại <= 3, hiển thị 5 trang đầu tiên
                pageToShow = i + 1
              } else if (currentPage >= totalPages - 2) {
                // Nếu trang hiện tại gần cuối, hiển thị 5 trang cuối cùng
                pageToShow = totalPages - 4 + i
              } else {
                // Hiển thị 2 trang trước và 2 trang sau trang hiện tại
                pageToShow = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageToShow}
                  variant={currentPage === pageToShow ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(pageToShow)}
                >
                  {pageToShow}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Sau
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <OrderDetailDialog orderId={selectedOrderId} open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen} />
    </div>
  )
}
