import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"

// Đặt thời gian thực thi tối đa là 5 giây để tránh timeout
export const maxDuration = 5

export async function GET(request: NextRequest) {
  try {
    // Lấy orderNumber từ query params
    const orderNumber = request.nextUrl.searchParams.get("orderNumber")

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 })
    }

    // Lấy thông tin đơn hàng
    const orders = await query("SELECT id FROM orders WHERE order_number = ?", [orderNumber])

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const orderId = orders[0].id

    // Lấy thông tin giao dịch
    const transactions = await query(
      `SELECT ot.*, o.payment_status, o.order_status 
       FROM order_transactions ot
       JOIN orders o ON ot.order_id = o.id
       WHERE ot.order_id = ?
       ORDER BY ot.created_at DESC
       LIMIT 5`,
      [orderId],
    )

    return NextResponse.json({
      success: true,
      transactions: transactions,
    })
  } catch (error) {
    console.error("Error checking transactions:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
