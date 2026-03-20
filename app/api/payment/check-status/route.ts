import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"

// Hàm xử lý an toàn transaction_data
function parseTransactionData(data: any): any {
  if (!data) return null

  // Nếu đã là object, trả về trực tiếp
  if (typeof data === "object" && data !== null) {
    return data
  }

  // Nếu là string, thử parse
  if (typeof data === "string") {
    try {
      // Kiểm tra xem có phải là "[object Object]" không
      if (data === "[object Object]") {
        return {}
      }
      return JSON.parse(data)
    } catch (error) {
      console.warn("Failed to parse transaction_data:", error)
      return null
    }
  }

  // Trường hợp khác, trả về null
  return null
}

export async function GET(request: NextRequest) {
  try {
    const orderNumber = request.nextUrl.searchParams.get("orderNumber")

    if (!orderNumber) {
      return NextResponse.json({ success: false, message: "Order number is required" }, { status: 400 })
    }

    // Lấy thông tin đơn hàng từ database
    const orders = await query("SELECT id, payment_status, created_at, total FROM orders WHERE order_number = ?", [
      orderNumber,
    ])

    if (orders.length === 0) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    const order = orders[0]

    // Nếu đơn hàng đã thanh toán, trả về thông tin giao dịch
    if (order.payment_status === "paid" || order.payment_status === "cod_pending") {
      // Lấy thông tin giao dịch từ bảng order_transactions
      const transactions = await query(
        "SELECT id, transaction_id, amount, provider, status, transaction_data, created_at FROM order_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
        [order.id],
      )

      const transaction = transactions.length > 0 ? transactions[0] : null

      return NextResponse.json({
        success: true,
        paid: true,
        status: order.payment_status,
        transactionId: transaction?.transaction_id || null,
        transactionInfo: transaction
          ? {
              id: transaction.id,
              amount: transaction.amount,
              provider: transaction.provider,
              status: transaction.status,
              data: parseTransactionData(transaction.transaction_data),
              createdAt: transaction.created_at,
            }
          : null,
      })
    }

    // Nếu đơn hàng chưa thanh toán, trả về thông tin đơn hàng
    return NextResponse.json({
      success: true,
      paid: false,
      status: order.payment_status,
      orderInfo: {
        id: order.id,
        status: order.payment_status,
        createdAt: order.created_at,
        total: order.total,
      },
    })
  } catch (error) {
    console.error("Error checking payment status:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred while checking payment status", error: String(error) },
      { status: 500 },
    )
  }
}
