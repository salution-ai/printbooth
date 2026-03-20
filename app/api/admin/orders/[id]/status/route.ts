import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { query, beginTransaction, commit, rollback } from "@/lib/mysql"
import crypto from "crypto"

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    // Lấy ID đơn hàng từ params
    const orderId = context.params.id

    // Xác thực admin
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Lấy dữ liệu từ request body
    const { orderStatus, paymentStatus, note } = await request.json()

    // Kiểm tra xem có ít nhất một trạng thái được cập nhật
    if (!orderStatus && !paymentStatus) {
      return NextResponse.json({ error: "Không có trạng thái nào được cập nhật" }, { status: 400 })
    }

    // Kiểm tra giá trị orderStatus có hợp lệ không
    const VALID_ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "completed", "cancelled"]
    if (orderStatus && !VALID_ORDER_STATUSES.includes(orderStatus)) {
      return NextResponse.json(
        { error: `Trạng thái đơn hàng không hợp lệ. Các giá trị hợp lệ: ${VALID_ORDER_STATUSES.join(", ")}` },
        { status: 400 },
      )
    }

    // Kiểm tra giá trị paymentStatus có hợp lệ không
    const VALID_PAYMENT_STATUSES = ["pending", "paid", "cod_pending", "failed"]
    if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json(
        { error: `Trạng thái thanh toán không hợp lệ. Các giá trị hợp lệ: ${VALID_PAYMENT_STATUSES.join(", ")}` },
        { status: 400 },
      )
    }

    // Lấy trạng thái hiện tại của đơn hàng
    const [currentStatus] = await query("SELECT order_status, payment_status FROM orders WHERE id = ?", [orderId])

    if (!currentStatus) {
      return NextResponse.json({ error: "Đơn hàng không tồn tại" }, { status: 404 })
    }

    try {
      // Bắt đầu transaction
      await beginTransaction()

      // Cập nhật trạng thái đơn hàng nếu có
      if (orderStatus && orderStatus !== currentStatus.order_status) {
        await query("UPDATE orders SET order_status = ?, updated_at = NOW() WHERE id = ?", [orderStatus, orderId])

        // Thêm vào lịch sử trạng thái
        await query("INSERT INTO order_status_history (id, order_id, status, note) VALUES (?, ?, ?, ?)", [
          crypto.randomUUID(),
          orderId,
          orderStatus,
          note || null,
        ])
      }

      // Cập nhật trạng thái thanh toán nếu có
      if (paymentStatus && paymentStatus !== currentStatus.payment_status) {
        await query("UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?", [paymentStatus, orderId])
      }

      // Commit transaction
      await commit()

      return NextResponse.json({
        success: true,
        message: "Cập nhật trạng thái đơn hàng thành công",
      })
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await rollback()
      throw error
    }
  } catch (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng" }, { status: 500 })
  }
}
