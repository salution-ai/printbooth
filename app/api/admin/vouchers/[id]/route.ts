import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { verifyAuth } from "@/lib/auth"

// Lấy thông tin chi tiết voucher
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Xác thực admin
    const admin = await verifyAuth()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id

    // Lấy thông tin voucher
    const voucher = await query("SELECT * FROM vouchers WHERE id = ?", [id])

    if (voucher.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    return NextResponse.json(voucher[0])
  } catch (error) {
    console.error("Error fetching voucher:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// Cập nhật voucher
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Xác thực admin
    const admin = await verifyAuth()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
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

    // Kiểm tra voucher tồn tại
    const existingVoucher = await query("SELECT id FROM vouchers WHERE id = ?", [id])

    if (existingVoucher.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    // Kiểm tra mã code đã tồn tại chưa (nếu thay đổi code)
    if (code) {
      const duplicateCode = await query("SELECT id FROM vouchers WHERE code = ? AND id != ?", [code, id])

      if (duplicateCode.length > 0) {
        return NextResponse.json({ error: "Voucher code already exists" }, { status: 400 })
      }
    }

    // Cập nhật voucher
    await query(
      `
      UPDATE vouchers SET
        code = ?,
        type = ?,
        value = ?,
        min_order_value = ?,
        max_discount = ?,
        start_date = ?,
        end_date = ?,
        usage_limit = ?,
        description = ?,
        is_active = ?
      WHERE id = ?
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
        id,
      ],
    )

    return NextResponse.json({
      success: true,
      message: "Voucher updated successfully",
    })
  } catch (error) {
    console.error("Error updating voucher:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// Xóa voucher
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Xác thực admin
    const admin = await verifyAuth()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id

    // Kiểm tra voucher tồn tại
    const existingVoucher = await query("SELECT id FROM vouchers WHERE id = ?", [id])

    if (existingVoucher.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    // Xóa voucher
    await query("DELETE FROM vouchers WHERE id = ?", [id])

    return NextResponse.json({
      success: true,
      message: "Voucher deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting voucher:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
