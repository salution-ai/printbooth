"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, TrendingUp, Users, Tag, Calendar } from "lucide-react"

interface VoucherStats {
  overallStats: {
    total_vouchers: number
    total_usages: number
    active_vouchers: number
    expired_vouchers: number
  }
  totalDiscountAmount: number
  topVouchers: {
    id: number
    code: string
    type: "FIXED" | "PERCENTAGE"
    value: number
    usage_count: number
    total_discount: number
  }[]
  monthlyStats: {
    month: string
    usage_count: number
    discount_amount: number
  }[]
}

export default function VoucherStatsPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [stats, setStats] = useState<VoucherStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch voucher stats
  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/vouchers/stats")
      if (!response.ok) throw new Error("Failed to fetch voucher stats")

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching voucher stats:", error)
      toast({
        title: "Error",
        description: "Failed to load voucher statistics",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchStats()
  }, [])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format month
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    return `Tháng ${month}/${year}`
  }

  // Navigate back to vouchers page
  const navigateBack = () => {
    router.push("/admin/vouchers")
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminHeader title="Thống kê mã giảm giá" />

      <div className="mb-6">
        <Button variant="outline" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng số mã giảm giá</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overallStats.total_vouchers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overallStats.active_vouchers} đang hoạt động, {stats.overallStats.expired_vouchers} đã hết hạn
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng số lần sử dụng</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overallStats.total_usages}</div>
                <p className="text-xs text-muted-foreground">
                  Trung bình {(stats.overallStats.total_usages / (stats.overallStats.total_vouchers || 1)).toFixed(1)}{" "}
                  lần/mã
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng số tiền giảm giá</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalDiscountAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Trung bình {formatCurrency(stats.totalDiscountAmount / (stats.overallStats.total_usages || 1))} / lần
                  sử dụng
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tỷ lệ sử dụng</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.overallStats.total_vouchers > 0
                    ? `${((stats.overallStats.total_usages / stats.overallStats.total_vouchers) * 100).toFixed(1)}%`
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground">Dựa trên tổng số mã giảm giá đã tạo</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Vouchers */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 mã giảm giá được sử dụng nhiều nhất</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topVouchers.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Chưa có dữ liệu</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã giảm giá</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Số lần sử dụng</TableHead>
                      <TableHead>Tổng tiền giảm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.code}</TableCell>
                        <TableCell>{voucher.type === "FIXED" ? "Giảm trực tiếp" : "Giảm theo %"}</TableCell>
                        <TableCell>
                          {voucher.type === "FIXED" ? formatCurrency(voucher.value) : `${voucher.value}%`}
                        </TableCell>
                        <TableCell>{voucher.usage_count}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(voucher.total_discount || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Monthly Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê theo tháng (6 tháng gần nhất)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.monthlyStats.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Chưa có dữ liệu</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tháng</TableHead>
                      <TableHead>Số lần sử dụng</TableHead>
                      <TableHead>Tổng tiền giảm</TableHead>
                      <TableHead>Trung bình / lần sử dụng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.monthlyStats.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{formatMonth(month.month)}</TableCell>
                        <TableCell>{month.usage_count}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(month.discount_amount)}</TableCell>
                        <TableCell>{formatCurrency(month.discount_amount / month.usage_count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Không thể tải dữ liệu thống kê</p>
        </div>
      )}
    </div>
  )
}
