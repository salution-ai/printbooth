"use server"

import { query } from "@/lib/mysql"
import type { Template, TemplateCategory } from "@/types/editor"
import { cache } from "react"

// Thêm caching cho hàm getTemplatesFromDatabase
export const getTemplatesFromDatabase = cache(async (): Promise<Template[]> => {
  console.log(`[${new Date().toISOString()}] START: getTemplatesFromDatabase - Bắt đầu lấy templates`)
  const startTime = Date.now()

  try {
    // Sử dụng JOIN để lấy tất cả dữ liệu cần thiết trong một truy vấn duy nhất
    console.log(`[${new Date().toISOString()}] QUERY: Đang truy vấn bảng templates với JOIN`)
    const queryStartTime = Date.now()

    // Lấy tất cả templates, layouts và categories trong một truy vấn duy nhất
    const results = await query(`
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
        t.print_sale_price,
        tl.slot_id, 
        tl.x, 
        tl.y, 
        tl.width, 
        tl.height, 
        tl.custom_position,
        c.id as category_id, 
        c.name as category_name
      FROM 
        templates t
      LEFT JOIN 
        template_layouts tl ON t.id = tl.template_id
      LEFT JOIN 
        template_categories tc ON t.id = tc.template_id
      LEFT JOIN 
        categories c ON tc.category_id = c.id
      ORDER BY 
        t.created_at DESC, tl.slot_id ASC
    `)

    console.log(
      `[${new Date().toISOString()}] QUERY DONE: Đã lấy dữ liệu từ database sau ${Date.now() - queryStartTime}ms`,
    )

    if (!Array.isArray(results) || results.length === 0) {
      console.log(`[${new Date().toISOString()}] WARNING: No templates found or result is not an array:`, results)
      return []
    }

    // Xử lý kết quả để nhóm thành các templates
    const templatesMap = new Map<string, any>()

    results.forEach((row: any) => {
      const templateId = row.template_id.toString()

      // Đảm bảo các trường giá trị là số
      row.download_price = row.download_price ? Number(row.download_price) : 0
      row.download_sale_price = row.download_sale_price ? Number(row.download_sale_price) : undefined
      row.print_price = row.print_price ? Number(row.print_price) : 0
      row.print_sale_price = row.print_sale_price ? Number(row.print_sale_price) : undefined

      // Nếu template chưa tồn tại trong map, thêm vào
      if (!templatesMap.has(templateId)) {
        templatesMap.set(templateId, {
          id: templateId,
          name: row.template_name,
          description: row.description || "",
          slots: row.slots || 0,
          category: [],
          image: row.image || "",
          frameImage: row.frame_image || row.frame_url || "",
          frameUrl: row.frame_url || row.frame_image || "",
          aspectRatio: row.aspect_ratio || 1,
          price: row.price !== undefined && row.price !== null ? row.price : 99000,
          download_price: row.download_price !== undefined && row.download_price !== null ? row.download_price : 49000,
          download_sale_price: row.download_sale_price !== undefined && row.download_sale_price !== null ? row.download_sale_price : null,
          print_price: row.print_price !== undefined && row.print_price !== null ? row.print_price : 99000,
          print_sale_price: row.print_sale_price !== undefined && row.print_sale_price !== null ? row.print_sale_price : null,
          layout: [],
        })
      }

      // Lấy template từ map
      const template = templatesMap.get(templateId)

      // Thêm layout nếu có
      if (row.slot_id !== null && !template.layout.some((l: any) => l.id === `${row.slot_id}`)) {
        template.layout.push({
          id: `${row.slot_id}`,
          x: Number.parseFloat(row.x),
          y: Number.parseFloat(row.y),
          width: Number.parseFloat(row.width),
          height: Number.parseFloat(row.height),
          customPosition: row.custom_position === 1,
        })
      }

      // Thêm category nếu có và chưa tồn tại trong mảng
      if (row.category_id && !template.category.includes(row.category_id.toString())) {
        template.category.push(row.category_id.toString())
      }
    })

    // Chuyển map thành mảng templates
    const templates = Array.from(templatesMap.values())

    // Cập nhật số slots nếu chưa có
    templates.forEach((template) => {
      if (!template.slots || template.slots === 0) {
        template.slots = template.layout.length
      }
    })

    console.log(
      `[${new Date().toISOString()}] FINISH: getTemplatesFromDatabase hoàn thành sau ${Date.now() - startTime}ms`,
    )
    return templates
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Lỗi khi lấy templates sau ${Date.now() - startTime}ms:`, error)
    return []
  }
})

// Thêm caching cho hàm getTemplateCategories
export const getTemplateCategories = cache(async (): Promise<TemplateCategory[]> => {
  try {
    const categories = await query(`
      SELECT * FROM categories
      ORDER BY name ASC
    `)

    if (!Array.isArray(categories)) {
      console.log("Categories result is not an array:", categories)
      return []
    }

    return categories.map((category: any) => ({
      id: category.id.toString(),
      name: category.name,
    }))
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
})

export async function getCategories() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/categories`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch categories")
    }

    const data = await response.json()
    return data.categories
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}
