// Cập nhật cấu hình Casso với thông tin ngân hàng chính xác và biến môi trường client-side
const CASSO_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_CASSO_API_KEY || "", // Sử dụng biến môi trường client-side
  apiUrl: "https://oauth.casso.vn/v2", // Cập nhật URL API chính xác theo tài liệu
  bankId: "TPB",
  accountNumber: "11114062001", // Số tài khoản ngân hàng của bạn
  accountName: "Lê Đức Huy",
  bankName: "TPBank - Ngân hàng thương mại cổ phần Tiên Phong",
  webhookUrl: typeof window !== "undefined" ? `${window.location.origin}/api/payment/webhook` : "",
  secureToken: process.env.NEXT_PUBLIC_CASSO_SECURE_TOKEN || "", // Sử dụng biến môi trường client-side
}

// Hàm tạo chuỗi ngẫu nhiên cho mã đơn hàng
export function generateOrderCode(length = 8): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return `PL${result}`
}

// Cập nhật hàm tạo mã QR thanh toán qua VietQR với định dạng URL chính xác
export function generateVietQRCode(orderInfo: {
  orderCode: string
  amount: number
  description: string
}): string {
  // Tạo URL VietQR với định dạng chính xác
  const format = "compact" // Định dạng QR code (compact, qr, print)
  const baseUrl = `https://img.vietqr.io/image/${CASSO_CONFIG.bankId}-${CASSO_CONFIG.accountNumber}-${format}.png`

  // Thêm các tham số
  const params = new URLSearchParams()
  params.append("amount", orderInfo.amount.toString())
  params.append("addInfo", `${orderInfo.orderCode}`)
  params.append("accountName", CASSO_CONFIG.accountName)
  
  return `${baseUrl}?${params.toString()}`
}

// Cập nhật hàm checkPaymentStatus để sử dụng sort thay vì filter
export async function checkPaymentStatus(orderCode: string): Promise<{
  success: boolean
  paid: boolean
  amount?: number
  message: string
  transactionInfo?: any
  amountMatched?: boolean
}> {
  try {
    // Lấy thông tin đơn hàng từ localStorage để biết số tiền cần thanh toán
    const pendingOrder = getPendingOrder()
    const expectedAmount = pendingOrder?.total || 0

    // Gọi API Casso để lấy các giao dịch gần đây nhất, sắp xếp theo thời gian giảm dần
    const response = await fetch(`${CASSO_CONFIG.apiUrl}/transactions?sort=DESC`, {
      headers: {
        Authorization: `Apikey ${process.env.NEXT_PUBLIC_CASSO_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    // Kiểm tra xem có giao dịch nào không
    if (data.data && data.data.records && data.data.records.length > 0) {
      // Tìm giao dịch có chứa mã đơn hàng trong description
      const matchingTransaction = data.data.records.find((transaction: any) => {
        const description = transaction.description || ""
        return description.includes(orderCode)
      })

      if (matchingTransaction) {
        const receivedAmount = matchingTransaction.amount || 0

        // Kiểm tra số tiền nhận được có khớp với số tiền đơn hàng không
        const amountMatched = receivedAmount >= expectedAmount

        if (amountMatched) {
          return {
            success: true,
            paid: true,
            amount: receivedAmount,
            message: "Thanh toán đã được xác nhận",
            transactionInfo: matchingTransaction,
            amountMatched: true,
          }
        } else {
          return {
            success: true,
            paid: true,
            amount: receivedAmount,
            message: `Số tiền thanh toán (${receivedAmount.toLocaleString("vi-VN")}đ) thấp hơn số tiền đơn hàng (${expectedAmount.toLocaleString("vi-VN")}đ)`,
            transactionInfo: matchingTransaction,
            amountMatched: false,
          }
        }
      }
    }

    return {
      success: true,
      paid: false,
      message: "Chưa nhận được thanh toán",
    }
  } catch (error) {
    console.error("Error checking payment status:", error)
    return {
      success: false,
      paid: false,
      message: `Lỗi khi kiểm tra trạng thái thanh toán: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Hàm giả lập để kiểm tra trạng thái thanh toán (sử dụng cho demo)
export async function simulatePaymentCheck(orderCode: string): Promise<boolean> {
  // Trong môi trường thực tế, bạn sẽ sử dụng checkPaymentStatus để kiểm tra với Casso
  // Đây là hàm giả lập để demo, trả về kết quả ngẫu nhiên sau một khoảng thời gian
  return new Promise((resolve) => {
    setTimeout(() => {
      // 70% cơ hội thanh toán thành công (cho mục đích demo)
      const isSuccessful = Math.random() < 0.7
      resolve(isSuccessful)
    }, 3000) // Giả lập độ trễ 3 giây
  })
}

// Hàm lưu thông tin đơn hàng vào localStorage trước khi chuyển sang trang thanh toán
export function saveOrderBeforePayment(orderDetails: any): void {
  localStorage.setItem("photolab_pending_order", JSON.stringify(orderDetails))
}

// Hàm lấy thông tin đơn hàng đã lưu
export function getPendingOrder(): any {
  const orderJson = localStorage.getItem("photolab_pending_order")
  return orderJson ? JSON.parse(orderJson) : null
}

// Hàm xóa thông tin đơn hàng đã lưu sau khi thanh toán xong
export function clearPendingOrder(): void {
  localStorage.removeItem("photolab_pending_order")
}

// Cập nhật hàm registerCassoWebhook để sử dụng secure token từ biến môi trường
export async function registerCassoWebhook(): Promise<boolean> {
  try {
    const response = await fetch(`${CASSO_CONFIG.apiUrl}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CASSO_CONFIG.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook_url: CASSO_CONFIG.webhookUrl,
        secure_token: CASSO_CONFIG.secureToken, // Sử dụng secure token từ cấu hình
        webhook_for: ["transaction"], // Đăng ký webhook cho giao dịch
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error("Error registering Casso webhook:", error)
    return false
  }
}

// Hàm xử lý kết quả trả về từ VNPay
export function processVnpayReturn(searchParams: URLSearchParams): {
  success: boolean
  orderCode?: string
  transactionId?: string
  amount?: number
  message: string
} {
  const vnp_ResponseCode = searchParams.get("vnp_ResponseCode")
  const vnp_TxnRef = searchParams.get("vnp_TxnRef")
  const vnp_Amount = searchParams.get("vnp_Amount")
  const vnp_TransactionNo = searchParams.get("vnp_TransactionNo")

  if (vnp_ResponseCode === "00") {
    return {
      success: true,
      orderCode: vnp_TxnRef || undefined,
      transactionId: vnp_TransactionNo || undefined,
      amount: vnp_Amount ? Number.parseFloat(vnp_Amount) / 100 : undefined,
      message: "Giao dịch thành công",
    }
  } else {
    return {
      success: false,
      message: "Giao dịch thất bại",
    }
  }
}
