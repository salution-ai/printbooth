import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/mysql"
import { revalidatePath } from "next/cache"
import { sendOrderConfirmationEmail } from "@/services/email-service"
import { getOrderById } from "@/services/order-service"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ header
    const secureToken = request.headers.get("secure-token")

    // Kiểm tra token
    if (secureToken !== process.env.CASSO_SECURE_TOKEN) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Lấy dữ liệu từ request
    const data = await request.json()

    // Kiểm tra dữ liệu
    if (!data || !data.data || !Array.isArray(data.data)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }
    // Xử lý từng giao dịch
    for (const transaction of data.data) {
      console.log("Processing transaction:", transaction)
      // Kiểm tra description có chứa mã đơn hàng không
      const description = transaction.description || ""
      console.log("Transaction description:", description)

      // Tìm mã đơn hàng trong description (format: PL-XXXXXX hoặc PLXXXXXX)
      const orderCodeMatch = description.match(/PL[-]?[A-Z0-9]{8}/)
      console.log("Order code match:", orderCodeMatch)

      if (orderCodeMatch) {
        const orderCode = orderCodeMatch[0]
        console.log("Order code found:", orderCode)

        // Kiểm tra đơn hàng có tồn tại không
        const orders = await query("SELECT id, total, payment_status FROM orders WHERE order_number = ?", [orderCode])
        console.log("Orders found:", orders)
        if (orders.length > 0) {
          const order = orders[0]
          console.log("Order details:", order)
          // Kiểm tra trạng thái thanh toán
          if (order.payment_status === "pending") {
            console.log("Order already paid:", orderCode)
            // Cập nhật trạng thái thanh toán
            await query("UPDATE orders SET payment_status = ?, order_status = ? WHERE id = ?", [
              "paid",
              "processing",
              order.id,
            ])

            // Tạo ID cho giao dịch
            const transactionId = uuidv4()

            // Ghi log giao dịch vào bảng order_transactions
            await query(
              `
              INSERT INTO order_transactions (
                id, order_id, transaction_id, amount, provider, status, transaction_data
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `,
              [
                transactionId,
                order.id,
                transaction.id || transactionId,
                transaction.amount || order.total,
                "bank",
                "success",
                JSON.stringify(transaction),
              ],
            )

            // Lấy thông tin đơn hàng đầy đủ để gửi email
            const orderDetail = await getOrderById(order.id)

            if (orderDetail) {
              console.log("Sending email for online payment order:", orderCode)

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
            } else {
              console.error("Could not find order details for order ID:", order.id)
            }

            // Revalidate paths
            revalidatePath("/admin/orders")
            revalidatePath(`/admin/orders/${order.id}`)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing payment webhook:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
