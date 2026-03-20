"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { CopyNotification } from "@/components/copy-notification"
import Loading from "@/components/loading"

interface Category {
  id: string
  name: string
  created_at: string
  updated_at: string
  templateCount?: number
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [showCopyNotification, setShowCopyNotification] = useState(false)

  // Fetch categories
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/categories/with-count")
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách danh mục",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên danh mục không được để trống",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add category")
      }

      toast({
        title: "Thành công",
        description: "Đã thêm danh mục mới",
      })
      setNewCategoryName("")
      setIsAddDialogOpen(false)
      fetchCategories()
    } catch (error: any) {
      console.error("Error adding category:", error)
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm danh mục",
        variant: "destructive",
      })
    }
  }

  const handleCopyCategoryLink = async (categoryId: string) => {
    try {
      await navigator.clipboard.writeText(`https://photolab.tulie.vn/create?category=${categoryId}`)
      setShowCopyNotification(true)
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể sao chép liên kết",
        variant: "destructive",
      })
    }
  }

  // Edit category
  const handleEditCategory = async () => {
    if (!currentCategory || !newCategoryName.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên danh mục không được để trống",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/${currentCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update category")
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật danh mục",
      })
      setNewCategoryName("")
      setIsEditDialogOpen(false)
      setCurrentCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error("Error updating category:", error)
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật danh mục",
        variant: "destructive",
      })
    }
  }

  // Delete category
  const handleDeleteCategory = async () => {
    if (!currentCategory) return

    try {
      const response = await fetch(`/api/admin/categories/${currentCategory.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete category")
      }

      toast({
        title: "Thành công",
        description: "Đã xóa danh mục",
      })
      setIsDeleteDialogOpen(false)
      setCurrentCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error("Error deleting category:", error)
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa danh mục",
        variant: "destructive",
      })
    }
  }

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setCurrentCategory(category)
    setNewCategoryName(category.name)
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (category: Category) => {
    setCurrentCategory(category)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý danh mục</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm danh mục
        </Button>
      </div>

      {loading ? (
        <Loading />

      ) : (
        <Table>
          <TableCaption>Danh sách các danh mục</TableCaption>
          <TableHeader>
            <TableRow>
              {/* <TableHead>ID</TableHead> */}
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Số lượng template</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Ngày cập nhật</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Không có danh mục nào
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  {/* <TableCell className="font-medium">{category.id.substring(0, 8)}...</TableCell> */}
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.templateCount || 0}</TableCell>
                  <TableCell>{new Date(category.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(category.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCategoryLink(category.id)}
                        title="Sao chép liên kết"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(category)}
                        disabled={category.templateCount ? category.templateCount > 0 : false}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm danh mục mới</DialogTitle>
            <DialogDescription>Nhập tên cho danh mục mới</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Tên danh mục"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddCategory}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>Cập nhật tên danh mục</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Tên danh mục"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditCategory}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa danh mục</DialogTitle>
            <DialogDescription>Bạn có chắc chắn muốn xóa danh mục "{currentCategory?.name}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CopyNotification
        show={showCopyNotification}
        message={"Đã sao chép liên kết danh mục thành công!"}
        onClose={() => setShowCopyNotification(false)}
      />
    </div>
  )
}
