import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { v4 as uuidv4 } from "uuid"
import type { Template } from "@/types/editor"

// Danh sách templates mẫu
const templates: Template[] = [
  {
    id: "1",
    name: "Single Photo",
    description: "Simple frame for a single photo",
    slots: 4,
    category: ["basic", "single"],
    image: "/images/frame1.png",
    frameImage: "/images/frame1.png",
    layout: [
      {
        id: "slot-1",
        x: 41,
        y: 2,
        width: 18,
        height: 21,
      },
      {
        id: "slot-2",
        x: 41,
        y: 22.5,
        width: 18,
        height: 21,
      },
      {
        id: "slot-3",
        x: 41,
        y: 42.5,
        width: 18,
        height: 21,
      },
      {
        id: "slot-4",
        x: 41,
        y: 62,
        width: 18,
        height: 21,
      },
    ],
  },
  {
    id: "2",
    name: "Double Photo",
    description: "Frame for two photos side by side",
    slots: 3,
    category: ["basic", "double"],
    image: "/images/frame2.png",
    frameImage: "/images/frame2.png",
    layout: [
      {
        id: "slot-1",
        x: 42,
        y: 3,
        width: 16,
        height: 31,
      },
      {
        id: "slot-2",
        x: 42,
        y: 36,
        width: 16,
        height: 31,
      },
      {
        id: "slot-3",
        x: 42,
        y: 66,
        width: 16,
        height: 31,
      },
    ],
  },
  {
    id: "3",
    name: "Triple Photo",
    description: "Frame for three photos",
    slots: 3,
    category: ["basic", "multiple"],
    image: "/images/frame3.png",
    frameImage: "/images/frame3.png",
    layout: [
      {
        id: "slot-1",
        x: 41,
        y: 3,
        width: 17,
        height: 27,
      },
      {
        id: "slot-2",
        x: 41,
        y: 31,
        width: 17,
        height: 32,
      },
      {
        id: "slot-3",
        x: 41,
        y: 64,
        width: 17,
        height: 28,
      },
    ],
  },
  {
    id: "4",
    name: "Quad Photo",
    description: "Frame for four photos in a grid",
    slots: 3,
    category: ["basic", "multiple"],
    image: "/images/frame4.png",
    frameImage: "/images/frame4.png",
    layout: [
      {
        id: "slot-1",
        x: 42,
        y: 2,
        width: 16,
        height: 29,
      },
      {
        id: "slot-2",
        x: 42,
        y: 30,
        width: 16,
        height: 29,
      },
      {
        id: "slot-3",
        x: 42,
        y: 59,
        width: 16,
        height: 29,
      },
    ],
  },
  {
    id: "5",
    name: "Collage",
    description: "Artistic collage for multiple photos",
    slots: 4,
    category: ["creative", "multiple"],
    image: "/images/frame5.png",
    frameImage: "/images/frame5.png",
    layout: [
      {
        id: "slot-1",
        x: 42,
        y: 5,
        width: 16,
        height: 20,
      },
      {
        id: "slot-2",
        x: 42,
        y: 25,
        width: 16,
        height: 20,
      },
      {
        id: "slot-3",
        x: 42,
        y: 46,
        width: 16,
        height: 19,
      },
      {
        id: "slot-4",
        x: 42,
        y: 63,
        width: 16,
        height: 21,
      },
    ],
  },
]

// Danh sách categories
const categories = [
  { id: "basic", name: "Basic" },
  { id: "creative", name: "Creative" },
  { id: "single", name: "Single Photo" },
  { id: "double", name: "Double Photo" },
  { id: "multiple", name: "Multiple Photos" },
]

export async function GET() {
  try {
    // Kiểm tra xem đã có dữ liệu chưa
    const existingTemplates = await query("SELECT COUNT(*) as count FROM templates")
    if ((existingTemplates as any)[0].count > 0) {
      return NextResponse.json({ message: "Database already seeded" })
    }

    // Thêm categories
    for (const category of categories) {
      await query("INSERT INTO categories (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)", [
        category.id,
        category.name,
      ])
    }

    // Thêm templates
    for (const template of templates) {
      // Thêm template
      await query(
        `INSERT INTO templates 
         (id, name, description, slots, image, frame_image, aspect_ratio, price) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          template.id,
          template.name,
          template.description || "",
          template.slots,
          template.image,
          template.frameImage,
          template.aspectRatio || 1.0,
          99000, // Giá mặc định
        ],
      )

      // Thêm layout cho template
      for (const slot of template.layout) {
        await query(
          `INSERT INTO template_layouts 
           (id, template_id, slot_id, x, y, width, height, custom_position) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), template.id, slot.id, slot.x, slot.y, slot.width, slot.height, slot.customPosition || false],
        )
      }

      // Thêm categories cho template
      for (const categoryId of template.category) {
        await query("INSERT INTO template_categories (template_id, category_id) VALUES (?, ?)", [
          template.id,
          categoryId,
        ])
      }
    }

    return NextResponse.json({ success: true, message: "Database seeded successfully" })
  } catch (error: any) {
    console.error("Error seeding database:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
