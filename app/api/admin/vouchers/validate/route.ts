import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function POST(request: NextRequest) {
  try {
    console.log("came here")
    const body = await request.json()
    const { code, orderTotal } = body

    if (!code) {
      return NextResponse.json({ error: "Voucher code is required" }, { status: 400 })
    }

    // Kiểm tra voucher có tồn tại và còn hiệu lực không
    const vouchers = await query(
      `
      SELECT * FROM vouchers 
      WHERE code = ? 
        AND is_active = 1 
        AND start_date <= NOW() 
        AND end_date >= NOW()
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `,
      [code],
    )

    if (vouchers.length === 0) {
      return NextResponse.json({ error: "Invalid or expired voucher code" }, { status: 400 })
    }

    const voucher = vouchers[0]

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (orderTotal < voucher.min_order_value) {
      return NextResponse.json(
        {
          error: `Minimum order value required: ${voucher.min_order_value.toLocaleString("vi-VN")} VND`,
        },
        { status: 400 },
      )
    }

    // Tính toán số tiền giảm giá
    let discountAmount = 0
    if (voucher.type === "FIXED") {
      discountAmount = voucher.value
    } else if (voucher.type === "PERCENTAGE") {
      discountAmount = (orderTotal * voucher.value) / 100
      // Áp dụng giảm giá tối đa nếu có
      if (voucher.max_discount && discountAmount > voucher.max_discount) {
        discountAmount = voucher.max_discount
      }
    }

    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        discountAmount,
      },
    })
  } catch (error) {
    console.error("Error validating voucher:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
