import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"

// Hàm lấy chi tiết template
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // Await params trước khi sử dụng
    const resolvedParams = "then" in params ? await params : params
    const templateId = resolvedParams.id

    // Lấy thông tin template
    const templates = await query(`SELECT * FROM templates WHERE id = ?`, [templateId])

    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = templates[0]

    // Lấy layout cho template
    const layouts = await query(
      `SELECT id, slot_id, x, y, width, height, custom_position
       FROM template_layouts
       WHERE template_id = ?`,
      [templateId],
    )

    template.layout = layouts.map((layout: any) => ({
      id: layout.slot_id,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      customPosition: layout.custom_position === 1,
    }))

    // Lấy categories cho template
    const categories = await query(
      `SELECT c.id, c.name
       FROM categories c
       JOIN template_categories tc ON c.id = tc.category_id
       WHERE tc.template_id = ?`,
      [templateId],
    )

    template.category = categories.map((cat: any) => cat.id)
    template.categoryNames = categories.map((cat: any) => cat.name)

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Hàm cập nhật template
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // Await params trước khi sử dụng
    const resolvedParams = "then" in params ? await params : params
    const templateId = resolvedParams.id

    const body = await request.json()
    const {
      name,
      description,
      slots,
      image,
      frameImage,
      frame_image,
      frame_url,
      aspectRatio,
      layout,
      category,
      download_price,
      download_sale_price,
      print_price,
      print_sale_price,
    } = body

    const finalFrameImage = frameImage || frame_image

    // Validate dữ liệu đầu vào
    if (!name || !image || !finalFrameImage || !layout || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Kiểm tra template có tồn tại không
    const templates = await query(`SELECT id FROM templates WHERE id = ?`, [templateId])

    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Cập nhật thông tin template
    await query(
      `UPDATE templates 
       SET name = ?, description = ?, slots = ?, image = ?, 
           frame_image = ?, frame_url = ?, aspect_ratio = ?, 
           download_price = ?, download_sale_price = ?,
           print_price = ?, print_sale_price = ?
       WHERE id = ?`,
      [
        name,
        description || "",
        slots,
        image,
        finalFrameImage,
        frame_url || null,
        aspectRatio || 1.0,
        download_price !== undefined && download_price !== null ? download_price : 0,
        download_sale_price,
        print_price !== undefined && print_price !== null ? print_price : 0,
        print_sale_price,
        templateId,
      ],
    )

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

    // Xóa categories cũ
    await query(`DELETE FROM template_categories WHERE template_id = ?`, [templateId])

    // Thêm categories mới
    for (const categoryId of category) {
      await query(`INSERT INTO template_categories (template_id, category_id) VALUES (?, ?)`, [templateId, categoryId])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Hàm xóa template
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // Await params trước khi sử dụng
    const resolvedParams = "then" in params ? await params : params
    const templateId = resolvedParams.id

    // Kiểm tra template có tồn tại không
    const templates = await query(`SELECT id FROM templates WHERE id = ?`, [templateId])

    if (templates.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Xóa template (các bảng liên quan sẽ tự động xóa nhờ ON DELETE CASCADE)
    await query(`DELETE FROM templates WHERE id = ?`, [templateId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
