import { NextResponse } from "next/server"

export async function POST(req: Request) {
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

    // Lấy bank_acc_id từ request body
    const body = await req.json()
    const bankAccId = body.bank_acc_id

    if (!bankAccId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu bank_acc_id",
        },
        { status: 400 },
      )
    }

    // Gọi API đồng bộ giao dịch
    const response = await fetch("https://oauth.casso.vn/v2/sync", {
      method: "POST",
      headers: {
        Authorization: `Apikey ${process.env.CASSO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bank_acc_id: bankAccId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Đồng bộ giao dịch thành công",
      data: data.data,
    })
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi đồng bộ giao dịch: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
