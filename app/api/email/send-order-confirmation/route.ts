import { type NextRequest, NextResponse } from "next/server"
import { sendOrderConfirmationEmail } from "@/services/email-service"
import { getOrderByOrderNumber } from "@/services/order-service"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Received request to send order confirmation email:", data)

    // Kiểm tra các trường bắt buộc
    if (!data.orderNumber || !data.customerEmail) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: orderNumber or customerEmail" },
        { status: 400 },
      )
    }

    // Nếu không có items, thử lấy từ database
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      console.log("No items in request, fetching from database...")
      const orderFromDB = await getOrderByOrderNumber(data.orderNumber)

      if (orderFromDB && orderFromDB.items) {
        console.log("Found items in database:", orderFromDB.items)
        data.items = orderFromDB.items
      } else {
        console.log("No items found in database")
      }
    }

    // Gửi email xác nhận đơn hàng
    const success = await sendOrderConfirmationEmail({
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      items: data.items || [],
      total: data.total,
      paymentMethod: data.paymentMethod,
      deliveryOption: data.deliveryOption,
      includeDownloadLink: data.includeDownloadLink,
    })

    if (success) {
      return NextResponse.json({ success: true, message: "Email sent successfully" })
    } else {
      return NextResponse.json({ success: false, message: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error sending order confirmation email:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: (error as Error).message },
      { status: 500 },
    )
  }
}
