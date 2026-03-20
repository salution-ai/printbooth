import { type NextRequest, NextResponse } from "next/server"
import { createOrder, getOrders } from "@/services/order-service"
import { verifyToken } from "@/lib/auth"
import { cookies } from "next/headers"

// Tạo đơn hàng mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Kiểm tra dữ liệu đầu vào
    if (!body.orderNumber || !body.customerInfo || !body.items || (body.total === undefined || body.total === null)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Tạo đơn hàng mới
    const order = await createOrder(body)

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

// Lấy danh sách đơn hàng (chỉ cho admin)
export async function GET(req: NextRequest) {
  try {
    // Xác thực admin
    const token = cookies().get("admin_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isValid = await verifyToken(token)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Lấy tham số từ URL
    const url = new URL(req.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")

    // Lấy các tham số lọc
    const filters: any = {}
    if (url.searchParams.has("orderNumber")) {
      filters.orderNumber = url.searchParams.get("orderNumber")
    }
    if (url.searchParams.has("customerEmail")) {
      filters.customerEmail = url.searchParams.get("customerEmail")
    }
    if (url.searchParams.has("paymentStatus")) {
      filters.paymentStatus = url.searchParams.get("paymentStatus")
    }
    if (url.searchParams.has("orderStatus")) {
      filters.orderStatus = url.searchParams.get("orderStatus")
    }

    // Lấy danh sách đơn hàng
    const { orders, total } = await getOrders(page, limit, filters)

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error getting orders:", error)
    return NextResponse.json({ error: "Failed to get orders" }, { status: 500 })
  }
}
