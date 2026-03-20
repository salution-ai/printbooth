"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUpload } from "@/components/admin/image-upload"
import type { Template, TemplateCategory } from "@/types/editor"
import { PlusCircle, Pencil, Trash2, LogOut, ChevronLeft, ChevronRight, PencilRuler, Search, Eye } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { formatDate } from "@/utils/utils"
import Loading from "@/components/loading"

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<Partial<Template> | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 1000,
    total: 0,
    totalPages: 1,
  })
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    name: "",
    slots: "",
    category: "",
  })

  const { toast } = useToast()

  // Fetch templates and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [templatesRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/templates?page=${pagination.page}&limit=${pagination.limit}`),
          fetch("/api/admin/categories"),
        ])

        if (!templatesRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const templatesData = await templatesRes.json()
        const categoriesData = await categoriesRes.json()

        setTemplates(templatesData.templates || [])
        setPagination(templatesData.pagination || pagination)
        setCategories(categoriesData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [pagination.page, toast])

  const handleSearch = () => {
    // Parse search query to determine if it's an order number or email
    if (searchQuery.includes("@")) {
      setFilters({ ...filters, customerEmail: searchQuery, orderNumber: "" })
    } else {
      setFilters({ ...filters, orderNumber: searchQuery, customerEmail: "" })
    }
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      name: "",
      slots: "",
      category: "",
    })
    setSearchQuery("")
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setCurrentPage(1)
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear admin token cookie
      await fetch("/api/admin/auth/logout", { method: "POST" })
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Open dialog to add new template
  const handleAddTemplate = () => {
    setCurrentTemplate({
      name: "",
      description: "",
      slots: 1,
      image: "",
      frameImage: "",
      category: [],
      layout: [
        {
          id: "slot-1",
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        },
      ],
      download_price: 15000,
      print_price: 35000,
    })
    setIsDialogOpen(true)
  }

  // Open dialog to edit template
  const handleEditTemplate = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/templates/${id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch template")
      }

      const template = await response.json()
      const formatedTemplate = {
        ...template,
        print_price: Number.parseFloat(template.print_price),
        download_price: Number.parseFloat(template.download_price),
        print_sale_price: Number.parseFloat(template.print_sale_price),
        download_sale_price: Number.parseFloat(template.download_sale_price)
      }
      setCurrentTemplate(formatedTemplate)
      setIsDialogOpen(true)
    } catch (error) {
      console.error("Error fetching template:", error)
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Open dialog to confirm delete
  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/templates/${templateToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      setTemplates(templates.filter((t) => t.id !== templateToDelete))
      toast({
        title: "Success",
        description: "Template deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A"
    if (amount === 0) return "Miễn phí"
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  // Save template (create or update)
  const handleSaveTemplate = async () => {
    if (!currentTemplate) return

    setIsSaving(true)
    try {
      const isEditing = Boolean(currentTemplate.id)
      const url = isEditing ? `/api/admin/templates/${currentTemplate.id}` : "/api/admin/templates"

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentTemplate),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? "update" : "create"} template`)
      }

      // Refresh templates list
      const templatesRes = await fetch(`/api/admin/templates?page=${pagination.page}&limit=${pagination.limit}`)
      if (!templatesRes.ok) {
        throw new Error("Failed to refresh templates")
      }

      const templatesData = await templatesRes.json()
      setTemplates(templatesData.templates || [])
      setPagination(templatesData.pagination || pagination)

      toast({
        title: "Success",
        description: `Template ${isEditing ? "updated" : "created"} successfully`,
      })

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: `Failed to ${currentTemplate.id ? "update" : "create"} template`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle input change for template form
  const handleInputChange = (field: string, value: any) => {
    if (!currentTemplate) return

    setCurrentTemplate({
      ...currentTemplate,
      [field]: value,
    })
  }

  const handleInputChangeImage = (field: string, value: string) => {
    if (!currentTemplate) return
    setCurrentTemplate({
      ...currentTemplate,
      image: value,
      frameImage: value,
    })
  }

  // Handle category toggle
  const handleCategoryToggle = (categoryId: string) => {
    if (!currentTemplate) return

    const currentCategories = [...(currentTemplate.category || [])]
    const index = currentCategories.indexOf(categoryId)

    if (index === -1) {
      currentCategories.push(categoryId)
    } else {
      currentCategories.splice(index, 1)
    }

    setCurrentTemplate({
      ...currentTemplate,
      category: currentCategories,
    })
  }

  // Handle layout change
  const handleLayoutChange = (index: number, field: string, value: any) => {
    if (!currentTemplate || !currentTemplate.layout) return

    const newLayout = [...currentTemplate.layout]
    newLayout[index] = {
      ...newLayout[index],
      [field]: Number.parseFloat(value),
    }

    setCurrentTemplate({
      ...currentTemplate,
      layout: newLayout,
    })
  }

  // Add new slot to layout
  const handleAddSlot = () => {
    if (!currentTemplate || !currentTemplate.layout) return

    const newSlotId = `slot-${currentTemplate.layout.length + 1}`
    const newLayout = [
      ...currentTemplate.layout,
      {
        id: newSlotId,
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      },
    ]

    setCurrentTemplate({
      ...currentTemplate,
      layout: newLayout,
      slots: (currentTemplate.slots || 0) + 1,
    })
  }

  // Remove slot from layout
  const handleRemoveSlot = (index: number) => {
    if (!currentTemplate || !currentTemplate.layout) return

    const newLayout = [...currentTemplate.layout]
    newLayout.splice(index, 1)

    setCurrentTemplate({
      ...currentTemplate,
      layout: newLayout,
      slots: Math.max(1, (currentTemplate.slots || 0) - 1),
    })
  }

  return (
    <>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Quản lý Templates</h1>
          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
              <Input
                placeholder="Tìm theo tên, danh mục"
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
            <Button onClick={handleAddTemplate}>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm Template
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1 block">Danh mục</label>
            <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-gray-500">Tất cả danh mục</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Số slots</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Giá tải ảnh</TableHead>
                <TableHead>Giá in ảnh</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loading />
                    </TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Không có template nào
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      {/* <TableCell className="font-mono text-xs">{template.id}</TableCell> */}
                      <TableCell className="font-mono text-xs">
                        <Image
                          src={template.image}
                          height={100}
                          width={0}
                          style={{ height: 100, width: "auto" }}
                          alt={template.name}
                          sizes="100px"
                        />
                      </TableCell>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.layout?.length}</TableCell>
                      <TableCell>{template.categoryNames?.join(", ")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={template.download_sale_price ? "line-through text-gray-500 text-xs" : ""}>
                            {formatCurrency(template.download_price)}
                          </span>
                          {template.download_sale_price !== null && template.download_sale_price !== undefined && (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(template.download_sale_price)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={template.print_sale_price ? "line-through text-gray-500 text-xs" : ""}>
                            {formatCurrency(template.print_price)}
                          </span>
                          {template.print_sale_price !== null && template.print_sale_price !== undefined && (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(template.print_sale_price)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `https://photolab.tulie.vn/create?template=${template.id}&admin=Tulie!1@3`,
                                "_blank"
                              )
                            }
                          >
                            <PencilRuler className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteClick(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Số slots</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Giá tải ảnh</TableHead>
                      <TableHead>Giá in ảnh</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Không có template nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow key={template.id}>
                          {/* <TableCell className="font-mono text-xs">{template.id}</TableCell> */}
                          <TableCell className="font-mono text-xs">
                            <Image
                              src={template.image}
                              height={100}
                              width={0}
                              style={{ height: 100, width: "auto" }}
                              alt={template.name}
                              sizes="100px"
                            />
                          </TableCell>
                          <TableCell>{template.name}</TableCell>
                          <TableCell>{template.layout?.length}</TableCell>
                          <TableCell>{template.categoryNames?.join(", ")}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={template.download_sale_price ? "line-through text-gray-500 text-xs" : ""}>
                                {formatCurrency(template.download_price)}
                              </span>
                              {template.download_sale_price !== null && template.download_sale_price !== undefined && (
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(template.download_sale_price)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={template.print_sale_price ? "line-through text-gray-500 text-xs" : ""}>
                                {formatCurrency(template.print_price)}
                              </span>
                              {template.print_sale_price !== null && template.print_sale_price !== undefined && (
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(template.print_sale_price)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `https://photolab.tulie.vn/create?template=${template.id}&admin=Tulie!1@3`,
                                    "_blank"
                                  )
                                }
                              >
                                <PencilRuler className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template.id)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteClick(template.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Trang {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Template Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{currentTemplate?.id ? "Chỉnh sửa Template" : "Thêm Template mới"}</DialogTitle>
              <DialogDescription>Điền thông tin chi tiết về template</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Tên Template</Label>
                  <Input
                    id="name"
                    value={currentTemplate?.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={currentTemplate?.description || ""}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ImageUpload
                  label="Ảnh thumbnail"
                  value={currentTemplate?.image || ""}
                  onChange={(url) => handleInputChangeImage("image", url)}
                />

                {/* <ImageUpload
                label="Ảnh khung"
                value={currentTemplate?.frameImage || ""}
                onChange={(url) => handleInputChange("frameImage", url)}
              /> */}
              </div>

              <div>
                <Label htmlFor="aspectRatio">Tỷ lệ khung hình (mặc định: 1)</Label>
                <Input
                  id="aspectRatio"
                  type="number"
                  step="0.01"
                  value={currentTemplate?.aspectRatio || 1}
                  onChange={(e) => handleInputChange("aspectRatio", Number.parseFloat(e.target.value))}
                />
              </div>

              {/* Phần giá */}
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Thiết lập giá</h3>
                <Separator className="mb-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Giá tải ảnh */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium">Giá tải ảnh</h4>

                    <div>
                      <Label htmlFor="download_price">Giá gốc (VNĐ)</Label>
                      <Input
                        id="download_price"
                        type="number"
                        min="0"
                        value={currentTemplate?.download_price ?? 0}
                        onChange={(e) => handleInputChange("download_price", Number.parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Nhập 0 để đặt là miễn phí</p>
                    </div>

                    <div>
                      <Label htmlFor="download_sale_price">Giá khuyến mãi (VNĐ)</Label>
                      <Input
                        id="download_sale_price"
                        type="number"
                        min="0"
                        value={currentTemplate?.download_sale_price ?? ""}
                        placeholder="Để trống nếu không có khuyến mãi"
                        onChange={(e) => {
                          const value = e.target.value ? Number.parseFloat(e.target.value) : null
                          handleInputChange("download_sale_price", value)
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Để trống nếu không có khuyến mãi, nhập 0 để đặt là miễn phí
                      </p>
                    </div>
                  </div>

                  {/* Giá in ảnh */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium">Giá in ảnh</h4>

                    <div>
                      <Label htmlFor="print_price">Giá gốc (VNĐ)</Label>
                      <Input
                        id="print_price"
                        type="number"
                        min="0"
                        value={currentTemplate?.print_price ?? 0}
                        onChange={(e) => handleInputChange("print_price", Number.parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Nhập 0 để đặt là miễn phí</p>
                    </div>

                    <div>
                      <Label htmlFor="print_sale_price">Giá khuyến mãi (VNĐ)</Label>
                      <Input
                        id="print_sale_price"
                        type="number"
                        min="0"
                        value={currentTemplate?.print_sale_price ?? ""}
                        placeholder="Để trống nếu không có khuyến mãi"
                        onChange={(e) => {
                          const value = e.target.value ? Number.parseFloat(e.target.value) : null
                          handleInputChange("print_sale_price", value)
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Để trống nếu không có khuyến mãi, nhập 0 để đặt là miễn phí
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Danh mục</Label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={(currentTemplate?.category || []).includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Layout (Slots)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSlot}>
                    Thêm Slot
                  </Button>
                </div>

                {currentTemplate?.layout?.map((slot, index) => (
                  <div key={slot.id} className="border p-4 mb-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">
                        Slot {index + 1}: {slot.id}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveSlot(index)}
                        disabled={currentTemplate.layout?.length === 1}
                      >
                        Xóa
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`slot-${index}-x`}>Vị trí X (%)</Label>
                        <Input
                          id={`slot-${index}-x`}
                          type="number"
                          step="0.1"
                          value={slot.x}
                          onChange={(e) => handleLayoutChange(index, "x", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`slot-${index}-y`}>Vị trí Y (%)</Label>
                        <Input
                          id={`slot-${index}-y`}
                          type="number"
                          step="0.1"
                          value={slot.y}
                          onChange={(e) => handleLayoutChange(index, "y", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`slot-${index}-width`}>Chiều rộng (%)</Label>
                        <Input
                          id={`slot-${index}-width`}
                          type="number"
                          step="0.1"
                          value={slot.width}
                          onChange={(e) => handleLayoutChange(index, "width", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`slot-${index}-height`}>Chiều cao (%)</Label>
                        <Input
                          id={`slot-${index}-height`}
                          type="number"
                          step="0.1"
                          value={slot.height}
                          onChange={(e) => handleLayoutChange(index, "height", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveTemplate} disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa template này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isDeleting}>
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
