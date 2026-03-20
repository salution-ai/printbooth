"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface VoucherUsage {
  id: number
  voucher_id: number
  order_id: string
  user_email: string
  discount_amount: number
  order_total: number
  used_at: string
  voucher_code: string
  voucher_type: "FIXED" | "PERCENTAGE"
  voucher_value: number
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function VoucherUsagePage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [usageHistory, setUsageHistory] = useState<VoucherUsage[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null)
  const [vouchers, setVouchers] = useState<{ id: number; code: string }[]>([])

  // Fetch voucher usage history
  const fetchUsageHistory = async (page = 1, search = "", voucherId = null) => {
    setIsLoading(true)
    try {
      let url = `/api/admin/vouchers/usage?page=${page}&limit=${pagination.limit}`

      if (search) {
        url += `&search=${search}`
      }

      if (voucherId) {
        url += `&voucherId=${voucherId}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch usage history")

      const data = await response.json()
      setUsageHistory(data.usageHistory)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching usage history:", error)
      toast({
        title: "Error",
        description: "Failed to load usage history",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch vouchers for filter
  const fetchVouchers = async () => {
    try {
      const response = await fetch("/api/admin/vouchers?limit=100")
      if (!response.ok) throw new Error("Failed to fetch vouchers")

      const data = await response.json()
      setVouchers(data.vouchers.map((v: any) => ({ id: v.id, code: v.code })))
    } catch (error) {
      console.error("Error fetching vouchers:", error)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchUsageHistory(pagination.page, searchTerm, selectedVoucherId)
    fetchVouchers()
  }, [])

  // Handle search
  const handleSearch = () => {
    fetchUsageHistory(1, searchTerm, selectedVoucherId)
  }

  // Handle voucher filter change
  const handleVoucherChange = (value: string) => {
    setSelectedVoucherId(value === "all" ? null : value)
    fetchUsageHistory(1, searchTerm, value === "all" ? null : value)
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchUsageHistory(newPage, searchTerm, selectedVoucherId)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("vi-VN")
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Navigate back to vouchers page
  const navigateBack = () => {
    router.push("/admin/vouchers")
  }

  // Calculate total discount amount
  const totalDiscountAmount = usageHistory.reduce((sum, item) => sum + item.discount_amount, 0)

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminHeader title="Lịch sử sử dụng mã giảm giá" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Button variant="outline" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        <div className="flex flex-col md:flex-row w-full md:w-auto gap-2">
          <Select value={selectedVoucherId || "all"} onValueChange={handleVoucherChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Chọn mã giảm giá" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mã giảm giá</SelectItem>
              {vouchers.map((voucher) => (
                <SelectItem key={voucher.id} value={voucher.id.toString()}>
                  {voucher.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex w-full md:w-auto gap-2">
            <Input
              placeholder="Tìm kiếm theo mã, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Tổng quan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Tổng số lần sử dụng</p>
            <p className="text-2xl font-bold">{pagination.total}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Tổng số tiền giảm giá</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDiscountAmount)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Trung bình giảm giá/đơn hàng</p>
            <p className="text-2xl font-bold">
              {formatCurrency(pagination.total > 0 ? totalDiscountAmount / pagination.total : 0)}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : usageHistory.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy lịch sử sử dụng nào</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn hàng</TableHead>
                  <TableHead>Mã giảm giá</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Giá trị đơn hàng</TableHead>
                  <TableHead>Số tiền giảm</TableHead>
                  <TableHead>Thời gian sử dụng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageHistory.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell className="font-medium">{usage.order_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{usage.voucher_code}</span>
                        <span className="text-xs text-gray-500">
                          {usage.voucher_type === "FIXED"
                            ? formatCurrency(usage.voucher_value)
                            : `${usage.voucher_value}%`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{usage.user_email}</TableCell>
                    <TableCell>{formatCurrency(usage.order_total)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(usage.discount_amount)}</TableCell>
                    <TableCell>{formatDate(usage.used_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} trong {pagination.total} kết quả
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) => page === 1 || page === pagination.totalPages || Math.abs(page - pagination.page) <= 1,
                  )
                  .map((page, index, array) => {
                    const prevPage = array[index - 1]
                    const showEllipsis = prevPage && page - prevPage > 1

                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                        <Button
                          variant={pagination.page === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      </div>
                    )
                  })}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
