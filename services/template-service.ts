import { query } from "@/lib/mysql"
import type { Template } from "@/types/editor"

// Lấy danh sách tất cả templates
export async function getAllTemplates(): Promise<Template[]> {
  try {
    const templates = await query(`
      SELECT * FROM templates 
      WHERE is_deleted = 0
      ORDER BY created_at DESC
    `)

    // Lấy layout cho mỗi template
    const templatesWithLayout = await Promise.all(
      (templates as any[]).map(async (template) => {
        const layouts = await query(
          `
          SELECT * FROM template_layouts 
          WHERE template_id = ? 
          ORDER BY position ASC
        `,
          [template.id],
        )

        return {
          ...template,
          layout: layouts.map((layout: any) => ({
            id: layout.slot_id,
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
            customPosition: layout.custom_position === 1,
          })),
        }
      }),
    )

    return templatesWithLayout
  } catch (error) {
    console.error("Error getting templates:", error)
    throw error
  }
}

// Lấy template theo ID
export async function getTemplateById(id: string): Promise<Template | null> {
  try {
    const templates = await query(
      `
      SELECT * FROM templates 
      WHERE id = ? AND is_deleted = 0
    `,
      [id],
    )

    if (!templates || (templates as any[]).length === 0) {
      return null
    }

    const template = (templates as any[])[0]

    // Lấy layout cho template
    const layouts = await query(
      `
      SELECT * FROM template_layouts 
      WHERE template_id = ? 
      ORDER BY position ASC
    `,
      [id],
    )

    return {
      ...template,
      layout: (layouts as any[]).map((layout) => ({
        id: layout.slot_id,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        customPosition: layout.custom_position === 1,
      })),
    }
  } catch (error) {
    console.error(`Error getting template with id ${id}:`, error)
    throw error
  }
}

// Tạo template mới
export async function createTemplate(template: Omit<Template, "id">): Promise<string> {
  try {
    // Tạo ID mới cho template
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Thêm template vào database
    await query(
      `
      INSERT INTO templates (
        id, name, description, slots, image, frame_image, aspect_ratio, category, price, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
      [
        templateId,
        template.name,
        template.description || "",
        template.slots,
        template.image,
        template.frameImage,
        template.aspectRatio || 1,
        JSON.stringify(template.category),
        template.price || 0,
      ],
    )

    // Thêm layout cho template
    if (template.layout && template.layout.length > 0) {
      const layoutValues = template.layout.map((layout, index) => [
        `layout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        templateId,
        layout.id,
        layout.x,
        layout.y,
        layout.width,
        layout.height,
        layout.customPosition ? 1 : 0,
        index,
      ])

      // Sử dụng multi-row insert
      const placeholders = layoutValues.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")
      const flatValues = layoutValues.flat()

      await query(
        `
        INSERT INTO template_layouts (
          id, template_id, slot_id, x, y, width, height, custom_position, position
        ) VALUES ${placeholders}
      `,
        flatValues,
      )
    }

    return templateId
  } catch (error) {
    console.error("Error creating template:", error)
    throw error
  }
}

// Cập nhật template
export async function updateTemplate(id: string, template: Partial<Template>): Promise<void> {
  try {
    // Cập nhật thông tin template
    const updateFields = []
    const updateValues = []

    if (template.name !== undefined) {
      updateFields.push("name = ?")
      updateValues.push(template.name)
    }

    if (template.description !== undefined) {
      updateFields.push("description = ?")
      updateValues.push(template.description)
    }

    if (template.slots !== undefined) {
      updateFields.push("slots = ?")
      updateValues.push(template.slots)
    }

    if (template.image !== undefined) {
      updateFields.push("image = ?")
      updateValues.push(template.image)
    }

    if (template.frameImage !== undefined) {
      updateFields.push("frame_image = ?")
      updateValues.push(template.frameImage)
    }

    if (template.aspectRatio !== undefined) {
      updateFields.push("aspect_ratio = ?")
      updateValues.push(template.aspectRatio)
    }

    if (template.category !== undefined) {
      updateFields.push("category = ?")
      updateValues.push(JSON.stringify(template.category))
    }

    if (template.price !== undefined) {
      updateFields.push("price = ?")
      updateValues.push(template.price)
    }

    updateFields.push("updated_at = NOW()")

    if (updateFields.length > 0) {
      await query(
        `
        UPDATE templates 
        SET ${updateFields.join(", ")} 
        WHERE id = ?
      `,
        [...updateValues, id],
      )
    }

    // Cập nhật layout nếu có
    if (template.layout && template.layout.length > 0) {
      // Xóa layout cũ
      await query("DELETE FROM template_layouts WHERE template_id = ?", [id])

      // Thêm layout mới
      const layoutValues = template.layout.map((layout, index) => [
        `layout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        id,
        layout.id,
        layout.x,
        layout.y,
        layout.width,
        layout.height,
        layout.customPosition ? 1 : 0,
        index,
      ])

      // Sử dụng multi-row insert
      const placeholders = layoutValues.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")
      const flatValues = layoutValues.flat()

      await query(
        `
        INSERT INTO template_layouts (
          id, template_id, slot_id, x, y, width, height, custom_position, position
        ) VALUES ${placeholders}
      `,
        flatValues,
      )
    }
  } catch (error) {
    console.error(`Error updating template with id ${id}:`, error)
    throw error
  }
}

// Xóa template (soft delete)
export async function deleteTemplate(id: string): Promise<void> {
  try {
    await query(
      `
      UPDATE templates 
      SET is_deleted = 1, updated_at = NOW() 
      WHERE id = ?
    `,
      [id],
    )
  } catch (error) {
    console.error(`Error deleting template with id ${id}:`, error)
    throw error
  }
}

// Lấy danh sách categories
export async function getCategories(): Promise<{ id: string; name: string }[]> {
  try {
    const categories = await query(`
      SELECT * FROM template_categories
      WHERE is_active = 1
      ORDER BY name ASC
    `)

    return categories as { id: string; name: string }[]
  } catch (error) {
    console.error("Error getting categories:", error)
    throw error
  }
}
