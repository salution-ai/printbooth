import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { verifyAuth } from "@/lib/auth"

// Lấy thống kê về voucher
export async function GET(request: NextRequest) {
  try {
    // Xác thực admin
    const admin = await verifyAuth()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Thống kê tổng quan
    const overallStats = await query(`
      SELECT
        COUNT(*) as total_vouchers,
        SUM(usage_count) as total_usages,
        SUM(CASE WHEN is_active = 1 AND end_date >= NOW() THEN 1 ELSE 0 END) as active_vouchers,
        SUM(CASE WHEN end_date < NOW() THEN 1 ELSE 0 END) as expired_vouchers
      FROM vouchers
    `)

    // Tổng số tiền giảm giá
    const discountStats = await query(`
      SELECT SUM(discount_amount) as total_discount_amount
      FROM voucher_usage
    `)

    // Top 5 voucher được sử dụng nhiều nhất
    const topVouchers = await query(`
      SELECT 
        v.id,
        v.code,
        v.type,
        v.value,
        v.usage_count,
        SUM(vu.discount_amount) as total_discount
      FROM vouchers v
      LEFT JOIN voucher_usage vu ON v.id = vu.voucher_id
      GROUP BY v.id
      ORDER BY v.usage_count DESC
      LIMIT 5
    `)

    // Thống kê theo tháng (6 tháng gần nhất)
    const monthlyStats = await query(`
      SELECT 
        DATE_FORMAT(used_at, '%Y-%m') as month,
        COUNT(*) as usage_count,
        SUM(discount_amount) as discount_amount
      FROM voucher_usage
      WHERE used_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(used_at, '%Y-%m')
      ORDER BY month DESC
    `)

    return NextResponse.json({
      overallStats: overallStats[0],
      totalDiscountAmount: discountStats[0].total_discount_amount || 0,
      topVouchers,
      monthlyStats,
    })
  } catch (error) {
    console.error("Error fetching voucher stats:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
