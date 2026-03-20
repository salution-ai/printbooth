import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id

    // Lấy thông tin template từ database
    const templateResult = await query(
      `
      SELECT 
        t.id as template_id, 
        t.name as template_name, 
        t.description, 
        t.slots, 
        t.image, 
        t.frame_image, 
        t.frame_url, 
        t.aspect_ratio,
        t.price,
        t.download_price,
        t.download_sale_price,
        t.print_price,
        t.print_sale_price
      FROM 
        templates t
      WHERE 
        t.id = ?
    `,
      [templateId],
    )

    if (!Array.isArray(templateResult) || templateResult.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = templateResult[0]

    // Đảm bảo các trường giá trị là số
    template.download_price = template.download_price ? Number(template.download_price) : 0
    template.download_sale_price = template.download_sale_price ? Number(template.download_sale_price) : null
    template.print_price = template.print_price ? Number(template.print_price) : 0
    template.print_sale_price = template.print_sale_price ? Number(template.print_sale_price) : null
    template.price = template.price ? Number(template.price) : 0

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 })
  }
}
