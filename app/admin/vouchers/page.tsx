"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Search, Edit, Trash2, ChevronLeft, ChevronRight, BarChart } from "lucide-react"

interface Voucher {
  id: number
  code: string
  type: "FIXED" | "PERCENTAGE"
  value: number
  min_order_value: number
  max_discount: number | null
  start_date: string
  end_date: string
  usage_limit: number | null
  usage_count: number
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function VouchersPage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    type: "FIXED" as "FIXED" | "PERCENTAGE",
    value: 0,
    min_order_value: 0,
    max_discount: null as number | null,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    usage_limit: null as number | null,
    description: "",
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch vouchers
  const fetchVouchers = async (page = 1, search = "") => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/vouchers?page=${page}&limit=${pagination.limit}&search=${search}`)
      if (!response.ok) throw new Error("Failed to fetch vouchers")

      const data = await response.json()
      setVouchers(data.vouchers)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching vouchers:", error)
      toast({
        title: "Error",
        description: "Failed to load vouchers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchVouchers(pagination.page, searchTerm)
  }, [])

  // Handle search
  const handleSearch = () => {
    fetchVouchers(1, searchTerm)
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchVouchers(newPage, searchTerm)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN")
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Open dialog to add new voucher
  const openAddDialog = () => {
    setSelectedVoucher(null)
    setFormData({
      code: "",
      type: "FIXED",
      value: 0,
      min_order_value: 0,
      max_discount: null,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      usage_limit: null,
      description: "",
      is_active: true,
    })
    setIsDialogOpen(true)
  }

  // Open dialog to edit voucher
  const openEditDialog = async (voucher: Voucher) => {
    setSelectedVoucher(voucher)

    // Format dates for the form
    const startDate = new Date(voucher.start_date).toISOString().split("T")[0]
    const endDate = new Date(voucher.end_date).toISOString().split("T")[0]

    setFormData({
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      min_order_value: voucher.min_order_value,
      max_discount: voucher.max_discount,
      start_date: startDate,
      end_date: endDate,
      usage_limit: voucher.usage_limit,
      description: voucher.description || "",
      is_active: voucher.is_active,
    })

    setIsDialogOpen(true)
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setIsDeleteDialogOpen(true)
  }

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target

    if (type === "number") {
      setFormData({
        ...formData,
        [name]: value === "" ? null : Number(value),
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // Handle radio group change
  const handleTypeChange = (value: "FIXED" | "PERCENTAGE") => {
    setFormData({
      ...formData,
      type: value,
    })
  }

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean) => {
    setFormData({
      ...formData,
      is_active: checked,
    })
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let url = "/api/admin/vouchers"
      let method = "POST"

      if (selectedVoucher) {
        url = `/api/admin/vouchers/${selectedVoucher.id}`
        method = "PUT"
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save voucher")
      }

      toast({
        title: "Success",
        description: selectedVoucher ? "Voucher updated successfully" : "Voucher created successfully",
      })

      setIsDialogOpen(false)
      fetchVouchers(pagination.page, searchTerm)
    } catch (error: any) {
      console.error("Error saving voucher:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save voucher",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete voucher
  const handleDelete = async () => {
    if (!selectedVoucher) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/vouchers/${selectedVoucher.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete voucher")
      }

      toast({
        title: "Success",
        description: "Voucher deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      fetchVouchers(pagination.page, searchTerm)
    } catch (error: any) {
      console.error("Error deleting voucher:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete voucher",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Navigate to usage history page
  const navigateToUsageHistory = () => {
    router.push("/admin/vouchers/usage")
  }

  // Navigate to stats page
  const navigateToStats = () => {
    router.push("/admin/vouchers/stats")
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* <AdminHeader title="Quản lý mã giảm giá" /> */}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={openAddDialog}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm mã giảm giá
          </Button>
          <Button variant="outline" onClick={navigateToUsageHistory}>
            Lịch sử sử dụng
          </Button>
          <Button variant="outline" onClick={navigateToStats}>
            <BarChart className="h-4 w-4 mr-2" />
            Thống kê
          </Button>
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <Input
            placeholder="Tìm kiếm mã giảm giá..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy mã giảm giá nào</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã giảm giá</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Thời hạn</TableHead>
                  <TableHead>Sử dụng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.code}</TableCell>
                    <TableCell>{voucher.type === "FIXED" ? "Giảm trực tiếp" : "Giảm theo %"}</TableCell>
                    <TableCell>
                      {voucher.type === "FIXED" ? formatCurrency(voucher.value) : `${voucher.value}%`}
                      {voucher.type === "PERCENTAGE" && voucher.max_discount && (
                        <span className="text-xs text-gray-500 block">
                          Tối đa: {formatCurrency(voucher.max_discount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(voucher.start_date)} - {formatDate(voucher.end_date)}
                    </TableCell>
                    <TableCell>
                      {voucher.usage_count} / {voucher.usage_limit || "∞"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          voucher.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {voucher.is_active ? "Kích hoạt" : "Vô hiệu"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(voucher)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(voucher)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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

      {/* Add/Edit Voucher Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedVoucher ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá mới"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Mã giảm giá
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Loại giảm giá</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={handleTypeChange}
                  className="col-span-3 flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FIXED" id="fixed" />
                    <Label htmlFor="fixed">Giảm trực tiếp (VND)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PERCENTAGE" id="percentage" />
                    <Label htmlFor="percentage">Giảm theo phần trăm (%)</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value" className="text-right">
                  Giá trị
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  value={formData.value}
                  onChange={handleInputChange}
                  className="col-span-3"
                  min={0}
                  required
                />
              </div>
              {formData.type === "PERCENTAGE" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max_discount" className="text-right">
                    Giảm tối đa
                  </Label>
                  <Input
                    id="max_discount"
                    name="max_discount"
                    type="number"
                    value={formData.max_discount === null ? "" : formData.max_discount}
                    onChange={handleInputChange}
                    className="col-span-3"
                    min={0}
                    placeholder="Không giới hạn"
                  />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="min_order_value" className="text-right">
                  Đơn hàng tối thiểu
                </Label>
                <Input
                  id="min_order_value"
                  name="min_order_value"
                  type="number"
                  value={formData.min_order_value}
                  onChange={handleInputChange}
                  className="col-span-3"
                  min={0}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start_date" className="text-right">
                  Ngày bắt đầu
                </Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end_date" className="text-right">
                  Ngày kết thúc
                </Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="usage_limit" className="text-right">
                  Giới hạn sử dụng
                </Label>
                <Input
                  id="usage_limit"
                  name="usage_limit"
                  type="number"
                  value={formData.usage_limit === null ? "" : formData.usage_limit}
                  onChange={handleInputChange}
                  className="col-span-3"
                  min={1}
                  placeholder="Không giới hạn"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Mô tả
                </Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Trạng thái</Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={handleCheckboxChange} />
                  <Label htmlFor="is_active">Kích hoạt</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                  </>
                ) : selectedVoucher ? (
                  "Cập nhật"
                ) : (
                  "Thêm mới"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xóa mã giảm giá <span className="font-bold">{selectedVoucher?.code}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">Hành động này không thể hoàn tác.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Xóa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
