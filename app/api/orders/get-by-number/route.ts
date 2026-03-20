import { type NextRequest, NextResponse } from "next/server"
import { getOrderByOrderNumber } from "@/services/order-service"

export async function GET(request: NextRequest) {
  try {
    // Lấy orderNumber từ query params
    const orderNumber = request.nextUrl.searchParams.get("orderNumber")

    if (!orderNumber) {
      return NextResponse.json({ success: false, message: "Order number is required" }, { status: 400 })
    }

    // Lấy thông tin đơn hàng từ cơ sở dữ liệu
    const order = await getOrderByOrderNumber(orderNumber)

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    // Trả về thông tin đơn hàng
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total,
        subtotal: order.subtotal || 0,
        shippingFee: order.shippingFee || 0,
        paymentMethod: order.paymentMethod,
        deliveryOption: order.deliveryOption,
        includeDownload: order.includeDownload,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        date: order.created_at || new Date().toISOString(), // Đảm bảo luôn có ngày
        items: order.items?.map((item) => ({
          id: item.id,
          templateId: item.templateId,
          previewUrl: item.previewUrl,
          price: item.price,
          quantity: item.quantity,
          template: item.template,
        })),
      },
    })
  } catch (error) {
    console.error("Error getting order by number:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred while getting the order", error: String(error) },
      { status: 500 },
    )
  }
}
