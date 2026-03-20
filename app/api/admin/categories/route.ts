import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { v4 as uuidv4 } from "uuid"

// Hàm lấy danh sách categories
export async function GET() {
  try {
    const categories = await query("SELECT * FROM categories ORDER BY name")
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Hàm tạo category mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Kiểm tra category đã tồn tại chưa
    const existingCategories = await query("SELECT id FROM categories WHERE name = ?", [name])

    if (existingCategories.length > 0) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const categoryId = uuidv4()
    await query("INSERT INTO categories (id, name) VALUES (?, ?)", [categoryId, name])

    return NextResponse.json({ success: true, id: categoryId })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
