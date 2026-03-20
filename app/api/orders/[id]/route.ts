import { type NextRequest, NextResponse } from "next/server"
import { getOrderById } from "@/services/order-service"
import { verifyAuth } from "@/lib/auth"
import { updateOrderStatus, updatePaymentStatus } from "@/services/order-service"

// Lấy thông tin đơn hàng theo ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // const { id } = params
    const resolvedParams = "then" in params ? await params : params
    const id = resolvedParams.id

    // Xác thực admin
    const auth = await verifyAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Lấy thông tin đơn hàng
    const order = await getOrderById(id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error("Error getting order:", error)
    return NextResponse.json({ error: "Failed to get order" }, { status: 500 })
  }
}

// Cập nhật trạng thái đơn hàng
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()

    // Xác thực admin
    const auth = await verifyAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Kiểm tra dữ liệu đầu vào
    if (!body.orderStatus && !body.paymentStatus) {
      return NextResponse.json({ error: "Missing status information" }, { status: 400 })
    }

    let updatedOrder

    // Cập nhật trạng thái đơn hàng
    if (body.orderStatus) {
      updatedOrder = await updateOrderStatus(id, body.orderStatus, body.note)
    }

    // Cập nhật trạng thái thanh toán
    if (body.paymentStatus) {
      updatedOrder = await updatePaymentStatus(id, body.paymentStatus, body.transactionData)
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
