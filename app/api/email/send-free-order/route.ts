import { type NextRequest, NextResponse } from "next/server"
import { sendFreeOrderEmail } from "@/services/email-service"
import { getOrderByOrderNumber } from "@/services/order-service"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Received request to send free order email:", data)

    // Kiểm tra các trường bắt buộc
    if (!data.email) {
      return NextResponse.json({ success: false, message: "Missing required field: email" }, { status: 400 })
    }

    if (!data.orderNumber) {
      return NextResponse.json({ success: false, message: "Missing required field: orderNumber" }, { status: 400 })
    }

    // Lấy thông tin tên và số điện thoại (nếu có)
    const customerName = data.customerName || ""
    const customerPhone = data.customerPhone || ""

    // Nếu không có downloadUrl hoặc downloadUrls, thử lấy từ database
    let downloadImages = data.downloadImages || data.downloadImage || []

    // Chuyển đổi downloadUrl thành mảng nếu là string
    if (typeof downloadImages === "string") {
      downloadImages = [downloadImages]
    }

    // Nếu không có downloadUrls, thử lấy từ database
    if (!downloadImages.length) {
      console.log("No downloadUrls in request, fetching from database...")
      const orderFromDB = await getOrderByOrderNumber(data.orderNumber)

      if (orderFromDB && orderFromDB.items && orderFromDB.items.length > 0) {
        // Lấy tất cả các previewUrl từ các items
        downloadImages = orderFromDB.items.filter((item) => item.previewUrl).map((item) => item.previewUrl)

        console.log(`Found ${downloadImages.length} downloadUrls in database:`, downloadImages)
      }

      if (!downloadImages.length) {
        return NextResponse.json({ success: false, message: "No download URLs found for this order" }, { status: 400 })
      }
    }

    // Gửi email thông báo đơn hàng miễn phí
    const success = await sendFreeOrderEmail(data.email, data.orderNumber, downloadImages, customerName, customerPhone)

    if (success) {
      return NextResponse.json({ success: true, message: "Email sent successfully" })
    } else {
      return NextResponse.json({ success: false, message: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error sending free order email:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error", error: (error as Error).message },
      { status: 500 },
    )
  }
}
