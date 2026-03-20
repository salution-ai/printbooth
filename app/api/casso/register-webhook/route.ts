import { NextResponse } from "next/server"

// Thêm hàm xử lý GET request
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Để đăng ký webhook, vui lòng sử dụng phương thức POST",
    instructions: "Gửi POST request đến endpoint này để đăng ký webhook với Casso",
  })
}

export async function POST() {
  try {
    // Kiểm tra xem API key và secure token có được cấu hình không
    if (!process.env.CASSO_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "CASSO_API_KEY không được cấu hình trong biến môi trường server-side",
        },
        { status: 500 },
      )
    }

    if (!process.env.CASSO_SECURE_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          message: "CASSO_SECURE_TOKEN không được cấu hình trong biến môi trường server-side",
        },
        { status: 500 },
      )
    }

    // URL webhook của ứng dụng
    const webhookUrl = `${process.env.VERCEL_URL || "http://localhost:3000"}/api/payment/webhook`

    // Trước tiên, xóa webhook cũ nếu có
    try {
      await fetch(`https://oauth.casso.vn/v2/webhooks?webhook=${encodeURIComponent(webhookUrl)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Apikey ${process.env.CASSO_API_KEY}`,
          "Content-Type": "application/json",
        },
      })
    } catch (deleteError) {
      console.warn("Error deleting existing webhook:", deleteError)
      // Tiếp tục ngay cả khi xóa thất bại
    }

    // Đăng ký webhook mới
    const response = await fetch("https://oauth.casso.vn/v2/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Apikey ${process.env.CASSO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: webhookUrl,
        secure_token: process.env.CASSO_SECURE_TOKEN,
        income_only: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const webhookData = await response.json()

    // Lấy thông tin người dùng
    const userInfoResponse = await fetch("https://oauth.casso.vn/v2/userInfo", {
      headers: {
        Authorization: `Apikey ${process.env.CASSO_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text()
      throw new Error(`API request failed with status ${userInfoResponse.status}: ${errorText}`)
    }

    const userInfoData = await userInfoResponse.json()

    return NextResponse.json({
      success: true,
      message: "Đăng ký webhook thành công",
      data: {
        webhook: webhookData.data,
        userInfo: userInfoData.data,
      },
    })
  } catch (error) {
    console.error("Error registering webhook:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi đăng ký webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
