import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { getOrderByOrderNumber } from "@/services/order-service"
import { sendOrderConfirmationEmail } from "@/services/email-service"

export async function GET(request: NextRequest) {
  try {
    // Lấy orderNumber từ query params
    const orderNumber = request.nextUrl.searchParams.get("orderNumber")

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 })
    }

    // Kiểm tra trạng thái thanh toán
    const orders = await query("SELECT id, payment_status, payment_transaction_id FROM orders WHERE order_number = ?", [
      orderNumber,
    ])

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = orders[0]
    const isPaid = order.payment_status === "completed" || order.payment_status === "paid"

    // Nếu đơn hàng đã thanh toán và chưa gửi email, gửi email xác nhận
    if (isPaid) {
      try {
        // Lấy thông tin đơn hàng đầy đủ
        const orderDetail = await getOrderByOrderNumber(orderNumber)

        if (orderDetail) {
          console.log("Sending email for paid order:", orderNumber)

          // Gửi email xác nhận đơn hàng kèm link tải ảnh
          await sendOrderConfirmationEmail({
            orderNumber: orderDetail.orderNumber,
            customerName: orderDetail.customerName,
            customerEmail: orderDetail.customerEmail,
            items: orderDetail.items,
            total: orderDetail.total,
            paymentMethod: "bank",
            deliveryOption: orderDetail.deliveryOption,
            includeDownloadLink: orderDetail.includeDownload,
          })
        }
      } catch (emailError) {
        console.error("Error sending email for paid order:", emailError)
        // Không return lỗi ở đây, vì chúng ta vẫn muốn trả về trạng thái thanh toán
      }
    }

    return NextResponse.json({
      success: true,
      paid: isPaid,
      status: order.payment_status,
      transactionId: order.payment_transaction_id,
    })
  } catch (error) {
    console.error("Error checking payment status:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
