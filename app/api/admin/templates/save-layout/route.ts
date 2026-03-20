import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Xác thực admin bằng cách sử dụng cookies từ request
    const authResult = await verifyAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Lấy dữ liệu từ request
    const { templateId, layout } = await request.json()

    if (!templateId || !layout || !Array.isArray(layout)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    // Kiểm tra template có tồn tại không
    const templates = await query(`SELECT id FROM templates WHERE id = ?`, [templateId])
    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Xóa layout cũ
    await query(`DELETE FROM template_layouts WHERE template_id = ?`, [templateId])

    // Thêm layout mới
    for (const slot of layout) {
      await query(
        `INSERT INTO template_layouts 
         (id, template_id, slot_id, x, y, width, height, custom_position) 
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, slot.id, slot.x, slot.y, slot.width, slot.height, slot.customPosition || false],
      )
    }

    return NextResponse.json({ success: true, message: "Layout saved successfully" })
  } catch (error) {
    console.error("Error saving layout:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
