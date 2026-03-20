import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

// Hàm lấy danh sách categories kèm số lượng templates sử dụng
export async function GET() {
  try {
    const categories = await query(`
      SELECT c.*, COUNT(tc.template_id) as templateCount
      FROM categories c
      LEFT JOIN template_categories tc ON c.id = tc.category_id
      GROUP BY c.id
      ORDER BY c.name
    `)

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories with count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
