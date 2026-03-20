import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Kiểm tra xem API key có được cấu hình không
    if (!process.env.CASSO_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "CASSO_API_KEY không được cấu hình trong biến môi trường server-side",
        },
        { status: 500 },
      )
    }

    // Gọi API Casso để kiểm tra kết nối - sử dụng endpoint chính xác theo tài liệu
    const response = await fetch("https://oauth.casso.vn/v2/userInfo", {
      headers: {
        Authorization: `Apikey ${process.env.CASSO_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Kết nối với Casso API thành công",
      data: {
        apiStatus: "connected",
        userInfo: data.data,
      },
    })
  } catch (error) {
    console.error("Error checking Casso API connection:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi kết nối với Casso API: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
