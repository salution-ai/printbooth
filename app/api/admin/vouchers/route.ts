import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { verifyAuth } from "@/lib/auth"

// Lấy danh sách voucher (có phân trang)
export async function GET(request: NextRequest) {
  try {
    // Xác thực admin
    const admin = await verifyAuth()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Lấy tham số phân trang
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit
    const search = searchParams.get("search") || ""

    // Đếm tổng số voucher
    let countQuery = "SELECT COUNT(*) as total FROM vouchers"
    let countParams: any[] = []

    if (search) {
      countQuery += " WHERE code LIKE ? OR description LIKE ?"
      countParams = [`%${search}%`, `%${search}%`]
    }

    const countResult = await query(countQuery, countParams)
    const total = countResult[0].total

    // Lấy danh sách voucher
    let sql = `
      SELECT * FROM vouchers
    `

    let params: any[] = []

    if (search) {
      sql += " WHERE code LIKE ? OR description LIKE ?"
      params = [`%${search}%`, `%${search}%`]
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.push(limit, offset)

    const vouchers = await query(sql, params)

    return NextResponse.json({
      vouchers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching vouchers:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// Tạo voucher mới
export async function POST(request: NextRequest) {
  try {
    // Xác thực admin
    const admin = await verifyAuth()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      code,
      type,
      value,
      min_order_value,
      max_discount,
      start_date,
      end_date,
      usage_limit,
      description,
      is_active,
    } = body

    // Kiểm tra mã voucher đã tồn tại chưa
    const existingVoucher = await query("SELECT id FROM vouchers WHERE code = ?", [code])

    if (existingVoucher.length > 0) {
      return NextResponse.json({ error: "Voucher code already exists" }, { status: 400 })
    }

    // Thêm voucher mới
    const result = await query(
      `
      INSERT INTO vouchers (
        code, type, value, min_order_value, max_discount, 
        start_date, end_date, usage_limit, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        code,
        type,
        value,
        min_order_value || 0,
        max_discount || null,
        start_date,
        end_date,
        usage_limit || null,
        description || null,
        is_active !== undefined ? is_active : true,
      ],
    )

    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: "Voucher created successfully",
    })
  } catch (error) {
    console.error("Error creating voucher:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
