"use server"

import { revalidatePath } from "next/cache"
import { getOrderByOrderNumber, updateOrderStatus, updatePaymentStatus } from "@/services/order-service"
import { sendOrderConfirmationEmail } from "@/services/email-service"
import { query } from "@/lib/mysql"

/**
 * Tạo đơn hàng mới
 */
export async function createOrderAction(orderData: any) {
  try {
    // Lấy thông tin đơn hàng
    const { orderNumber } = orderData

    // Kiểm tra xem orderNumber đã tồn tại chưa
    const existingOrders = await query("SELECT id FROM orders WHERE order_number = ?", [orderNumber])

    if (existingOrders.length > 0) {
      return {
        success: false,
        message: "Order number already exists",
      }
    }

    // Tạo đơn hàng mới
    const orderId = await new Promise((resolve, reject) => {
      // Xác định URL đầy đủ cho API endpoint
      const apiUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/orders`
          : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/orders`

      fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            resolve(data.order)
          } else {
            reject(data.error)
          }
        })
        .catch((error) => {
          reject(error)
        })
    })

    return { success: true, orderNumber: orderNumber }
  } catch (error: any) {
    console.error("Error in createOrderAction:", error)
    return {
      success: false,
      message: error.message || "An error occurred while creating the order",
    }
  }
}

/**
 * Kiểm tra trạng thái thanh toán của đơn hàng
 */
export async function checkPaymentStatusAction(orderNumber: string) {
  try {
    // Gọi API kiểm tra trạng thái thanh toán
    const apiUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/payment/check-status?orderNumber=${orderNumber}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/payment/check-status?orderNumber=${orderNumber}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        paid: false,
        message: errorData.error || "Failed to check payment status",
      }
    }

    const data = await response.json()

    // Nếu đơn hàng đã thanh toán, gửi email xác nhận
    if (data.paid) {
      try {
        // Lấy thông tin đơn hàng đầy đủ
        const orderDetail = await getOrderByOrderNumber(orderNumber)

        if (orderDetail) {
          console.log("Sending email for paid order from action:", orderNumber)

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
        }
      } catch (emailError) {
        console.error("Error sending email for paid order from action:", emailError)
        // Không return lỗi ở đây, vì chúng ta vẫn muốn trả về trạng thái thanh toán
      }
    }

    return {
      success: true,
      paid: data.paid,
      status: data.status,
      transactionId: data.transactionId,
      transactionInfo: data.transactionInfo,
    }
  } catch (error) {
    console.error("Error in checkPaymentStatusAction:", error)
    return {
      success: false,
      paid: false,
      message: "An error occurred while checking payment status",
    }
  }
}

/**
 * Cập nhật trạng thái thanh toán của đơn hàng
 */
export async function updatePaymentStatusAction(
  orderNumber: string,
  status: "pending" | "paid" | "cod_pending" | "failed",
  transactionData?: any,
) {
  try {
    // Lấy thông tin đơn hàng
    const order = await getOrderByOrderNumber(orderNumber)

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      }
    }

    // Cập nhật trạng thái thanh toán
    const updatedOrder = await updatePaymentStatus(order.id, status, transactionData)

    // Revalidate paths
    revalidatePath("/admin/orders")
    revalidatePath(`/admin/orders/${order.id}`)

    // Nếu thanh toán thành công, gửi email xác nhận
    if (status === "paid") {
      try {
        console.log("Sending email for updated payment status:", orderNumber)

        // Gửi email xác nhận đơn hàng kèm link tải ảnh
        await sendOrderConfirmationEmail({
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName,
          customerEmail: updatedOrder.customerEmail,
          items: updatedOrder.items,
          total: updatedOrder.total,
          paymentMethod: updatedOrder.paymentMethod,
          deliveryOption: updatedOrder.deliveryOption,
          includeDownloadLink: updatedOrder.includeDownload,
        })
      } catch (emailError) {
        console.error("Error sending email for updated payment status:", emailError)
        // Không return lỗi ở đây, vì chúng ta vẫn muốn trả về kết quả cập nhật
      }
    }

    return {
      success: true,
      order: updatedOrder,
    }
  } catch (error) {
    console.error("Error in updatePaymentStatusAction:", error)
    return {
      success: false,
      message: "An error occurred while updating payment status",
    }
  }
}

/**
 * Cập nhật trạng thái đơn hàng
 */
export async function updateOrderStatusAction(
  orderId: string,
  status: "pending" | "processing" | "shipped" | "delivered" | "completed" | "cancelled",
  note?: string,
) {
  try {
    // Cập nhật trạng thái đơn hàng
    const updatedOrder = await updateOrderStatus(orderId, status, note)

    // Revalidate paths
    revalidatePath("/admin/orders")
    revalidatePath(`/admin/orders/${orderId}`)

    return {
      success: true,
      order: updatedOrder,
    }
  } catch (error) {
    console.error("Error in updateOrderStatusAction:", error)
    return {
      success: false,
      message: "An error occurred while updating order status",
    }
  }
}

/**
 * Tạo mã đơn hàng ngẫu nhiên
 */
export async function generateOrderNumber() {
  const prefix = "PL"
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${randomPart}`
}
