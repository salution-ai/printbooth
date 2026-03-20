import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { v4 as uuidv4 } from "uuid"

// Hàm lấy danh sách templates
export async function GET(request: NextRequest) {
  try {
    console.log(`[${new Date().toISOString()}] START: GET /api/admin/templates - Bắt đầu xử lý request`)
    const startTime = Date.now()

    // Lấy tham số phân trang từ URL (nếu có)
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10)
    const offset = (page - 1) * limit

    // Sử dụng một truy vấn JOIN duy nhất để lấy tất cả dữ liệu cần thiết
    console.log(
      `[${new Date().toISOString()}] QUERY: Đang thực hiện truy vấn JOIN để lấy templates, layouts và categories`,
    )
    const queryStartTime = Date.now()

    const results = await query(
      `
      SELECT 
        t.id, t.name, t.description, t.slots, t.image, t.frame_image, t.frame_url, t.aspect_ratio, 
        t.price, t.download_price, t.download_sale_price, t.print_price, t.print_sale_price,
        tl.id as layout_id, tl.slot_id, tl.x, tl.y, tl.width, tl.height, tl.custom_position,
        c.id as category_id, c.name as category_name
      FROM templates t
      LEFT JOIN template_layouts tl ON t.id = tl.template_id
      LEFT JOIN template_categories tc ON t.id = tc.template_id
      LEFT JOIN categories c ON tc.category_id = c.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset],
    )

    console.log(`[${new Date().toISOString()}] QUERY DONE: Hoàn thành truy vấn sau ${Date.now() - queryStartTime}ms`)

    // Đếm tổng số templates để hỗ trợ phân trang
    const countResult = await query(`SELECT COUNT(DISTINCT id) as total FROM templates`)
    const totalTemplates = countResult[0]?.total || 0

    // Xử lý kết quả để nhóm thành các templates
    const templatesMap = new Map()

    if (Array.isArray(results)) {
      results.forEach((row: any) => {
        if (!row.id) return

        // Nếu template chưa tồn tại trong map, thêm vào
        if (!templatesMap.has(row.id)) {
          templatesMap.set(row.id, {
            id: row.id,
            name: row.name,
            description: row.description || "",
            slots: row.slots || 0,
            image: row.image || "",
            frameImage: row.frame_image || "",
            frameUrl: row.frame_url || "",
            aspectRatio: row.aspect_ratio || 1.0,
            price: row.price || 99000,
            download_price: row.download_price !== null ? row.download_price : 0,
            download_sale_price: row.download_sale_price,
            print_price: row.print_price !== null ? row.print_price : 0,
            print_sale_price: row.print_sale_price,
            category: [],
            categoryNames: [],
            layout: [],
          })
        }

        const template = templatesMap.get(row.id)

        // Thêm layout nếu có và chưa tồn tại
        if (row.slot_id && !template.layout.some((l: any) => l.id === row.slot_id)) {
          template.layout.push({
            id: row.slot_id,
            x: Number.parseFloat(row.x),
            y: Number.parseFloat(row.y),
            width: Number.parseFloat(row.width),
            height: Number.parseFloat(row.height),
            customPosition: row.custom_position === 1,
          })
        }

        // Thêm category nếu có và chưa tồn tại
        if (row.category_id && !template.category.includes(row.category_id)) {
          template.category.push(row.category_id)
          template.categoryNames.push(row.category_name)
        }
      })
    }

    // Chuyển map thành mảng templates
    const templates = Array.from(templatesMap.values())

    console.log(
      `[${new Date().toISOString()}] FINISH: GET /api/admin/templates hoàn thành sau ${Date.now() - startTime}ms, trả về ${templates.length} templates`,
    )

    return NextResponse.json({
      templates,
      pagination: {
        total: totalTemplates,
        page,
        limit,
        totalPages: Math.ceil(totalTemplates / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Hàm tạo template mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      slots,
      image,
      frameImage,
      frame_url,
      aspectRatio,
      layout,
      category,
      download_price,
      download_sale_price,
      print_price,
      print_sale_price,
    } = body

    // Validate dữ liệu đầu vào
    if (!name || !image || !frameImage || !layout || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Tạo ID mới cho template
    const templateId = uuidv4()

    // Thêm template vào database
    await query(
      `INSERT INTO templates 
       (id, name, description, slots, image, frame_image, frame_url, aspect_ratio, 
        download_price, download_sale_price, print_price, print_sale_price) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        name,
        description || "",
        slots,
        image,
        frameImage,
        frame_url || null,
        aspectRatio || 1.0,
        download_price !== undefined && download_price !== null ? download_price : 0,
        download_sale_price,
        print_price !== undefined && print_price !== null ? print_price : 0,
        print_sale_price,
      ],
    )

    // Thêm layout cho template
    for (const slot of layout) {
      await query(
        `INSERT INTO template_layouts 
         (id, template_id, slot_id, x, y, width, height, custom_position) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), templateId, slot.id, slot.x, slot.y, slot.width, slot.height, slot.customPosition || false],
      )
    }

    // Thêm categories cho template
    for (const categoryId of category) {
      await query(`INSERT INTO template_categories (template_id, category_id) VALUES (?, ?)`, [templateId, categoryId])
    }

    return NextResponse.json({ success: true, id: templateId })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
