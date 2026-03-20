import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"

// Hàm cập nhật category
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Kiểm tra category đã tồn tại chưa
    const existingCategories = await query("SELECT id FROM categories WHERE name = ? AND id != ?", [name, id])

    if (existingCategories.length > 0) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 })
    }

    await query("UPDATE categories SET name = ?, updated_at = NOW() WHERE id = ?", [name, id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Hàm xóa category
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Kiểm tra xem category có đang được sử dụng không
    const usedTemplates = await query("SELECT COUNT(*) as count FROM template_categories WHERE category_id = ?", [id])

    if (usedTemplates[0].count > 0) {
      return NextResponse.json({ error: "Cannot delete category that is being used by templates" }, { status: 400 })
    }

    await query("DELETE FROM categories WHERE id = ?", [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
