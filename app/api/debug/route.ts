import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET() {
  try {
    // Kiểm tra cấu trúc bảng categories
    const categoriesStructure = await query("DESCRIBE categories")

    // Kiểm tra dữ liệu mẫu từ bảng categories
    const sampleCategories = await query("SELECT * FROM categories LIMIT 5")

    // Kiểm tra dữ liệu mẫu từ bảng templates
    const sampleTemplates = await query("SELECT * FROM templates LIMIT 5")

    // Kiểm tra dữ liệu mẫu từ bảng template_layouts
    const sampleLayouts = await query("SELECT * FROM template_layouts LIMIT 5")

    // Kiểm tra dữ liệu mẫu từ bảng template_categories
    const sampleTemplateCategories = await query("SELECT * FROM template_categories LIMIT 5")

    return NextResponse.json({
      success: true,
      categoriesStructure,
      sampleCategories,
      sampleTemplates,
      sampleLayouts,
      sampleTemplateCategories,
      isCategoriesArray: Array.isArray(sampleCategories),
      isTemplatesArray: Array.isArray(sampleTemplates),
      isLayoutsArray: Array.isArray(sampleLayouts),
      isTemplateCategoriesArray: Array.isArray(sampleTemplateCategories),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
