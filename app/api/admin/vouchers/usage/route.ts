import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { verifyAuth } from "@/lib/auth"

// Lấy lịch sử sử dụng voucher (có phân trang)
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
    const voucherId = searchParams.get("voucherId")
    const search = searchParams.get("search") || ""

    // Đếm tổng số bản ghi
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM voucher_usage vu
      JOIN vouchers v ON vu.voucher_id = v.id
    `

    const countParams: any[] = []

    if (voucherId) {
      countQuery += " WHERE vu.voucher_id = ?"
      countParams.push(voucherId)
    } else if (search) {
      countQuery += " WHERE v.code LIKE ? OR vu.user_email LIKE ? OR vu.order_id LIKE ?"
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const countResult = await query(countQuery, countParams)
    const total = countResult[0].total

    // Lấy danh sách lịch sử sử dụng
    let sql = `
      SELECT 
        vu.*, 
        v.code as voucher_code,
        v.type as voucher_type,
        v.value as voucher_value
      FROM voucher_usage vu
      JOIN vouchers v ON vu.voucher_id = v.id
    `

    const params: any[] = []

    if (voucherId) {
      sql += " WHERE vu.voucher_id = ?"
      params.push(voucherId)
    } else if (search) {
      sql += " WHERE v.code LIKE ? OR vu.user_email LIKE ? OR vu.order_id LIKE ?"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    sql += " ORDER BY vu.used_at DESC LIMIT ? OFFSET ?"
    params.push(limit, offset)

    const usageHistory = await query(sql, params)

    return NextResponse.json({
      usageHistory,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching voucher usage history:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
