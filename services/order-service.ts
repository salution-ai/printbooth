import { v4 as uuidv4 } from "uuid"
import { query } from "@/lib/mysql"

// Interface cho đơn hàng
export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress?: string
  customerCity?: string
  customerNote?: string
  subtotal: number
  shippingFee: number
  discountAmount?: number
  total: number
  paymentMethod: "bank" | "cod"
  deliveryOption: "download" | "print"
  includeDownload: boolean
  paymentStatus: "pending" | "paid" | "cod_pending" | "failed"
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "completed" | "cancelled"
  voucherId?: number
  voucherCode?: string
  voucherType?: "FIXED" | "PERCENTAGE"
  voucherValue?: number
  createdAt: Date
  updatedAt: Date
  items?: OrderItem[]
  statusHistory?: OrderStatusHistory[]
  transactions?: OrderTransaction[]
}

// Interface cho sản phẩm trong đơn hàng
export interface OrderItem {
  id: string
  orderId: string
  templateId: string
  previewUrl?: string
  imageUrls: string[]
  price: number
  quantity: number
  createdAt: Date
  template?: {
    name: string
    image: string
    categories?: {
      id: string
      name: string
    }[]
  }
}

// Interface cho giao dịch thanh toán
export interface OrderTransaction {
  id: string
  orderId: string
  transactionId?: string
  amount: number
  provider: string
  status: "pending" | "success" | "failed"
  transactionData?: any
  createdAt: Date
}

// Interface cho lịch sử trạng thái đơn hàng
export interface OrderStatusHistory {
  id: string
  orderId: string
  status: string
  note?: string
  createdAt: Date
}

// Tạo đơn hàng mới
export async function createOrder(orderData: any): Promise<Order> {
  try {
    const orderId = uuidv4()
    const {
      orderNumber,
      customerInfo,
      items,
      subtotal,
      shippingFee,
      discountAmount,
      total,
      paymentMethod,
      deliveryOption,
      includeDownloadLink,
      paymentStatus,
      voucherId,
    } = orderData

    // Thêm đơn hàng vào bảng orders
    await query(
      `INSERT INTO orders (
        id, order_number, customer_name, customer_email, customer_phone, 
        customer_address, customer_city, customer_note, subtotal, 
        shipping_fee, discount_amount, total, payment_method, delivery_option, 
        include_download, payment_status, voucher_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNumber,
        customerInfo.name,
        customerInfo.email,
        customerInfo.phone,
        customerInfo.address || null,
        customerInfo.city || null,
        customerInfo.note || null,
        subtotal,
        shippingFee || 0,
        discountAmount || 0,
        total,
        paymentMethod,
        deliveryOption,
        deliveryOption === "print" ? includeDownloadLink : true,
        paymentStatus || "pending",
        voucherId || null,
      ],
    )

    // Thêm các sản phẩm vào bảng order_items
    if (items && items.length > 0) {
      for (const item of items) {
        const itemId = uuidv4()
        await query(
          `INSERT INTO order_items (
            id, order_id, template_id, preview_url, image_urls, 
            price, quantity
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.templateId,
            item.previewUrl || null,
            JSON.stringify(item.imageUrls || []),
            item.price,
            item.quantity || 1,
          ],
        )
      }
    }

    // Nếu có voucher, cập nhật thông tin sử dụng voucher
    if (voucherId) {
      // Cập nhật số lần sử dụng voucher
      await query(`UPDATE vouchers SET usage_count = usage_count + 1 WHERE id = ?`, [voucherId])

      // Thêm vào lịch sử sử dụng voucher
      await query(
        `INSERT INTO voucher_usage (
          voucher_id, order_id, user_email, discount_amount, order_total
        ) VALUES (?, ?, ?, ?, ?)`,
        [voucherId, orderId, customerInfo.email, discountAmount || 0, total],
      )
    }

    // Thêm trạng thái đơn hàng vào lịch sử
    await query(
      `INSERT INTO order_status_history (
        id, order_id, status, note
      ) VALUES (?, ?, ?, ?)`,
      [uuidv4(), orderId, "pending", "Đơn hàng mới được tạo"],
    )

    // Trả về đơn hàng đã tạo
    return getOrderById(orderId)
  } catch (error) {
    console.error("Error creating order:", error)
    throw new Error("Failed to create order")
  }
}

// Hàm an toàn để phân tích JSON
function safeJsonParse(jsonString: any) {
  if (!jsonString) return null

  // Nếu đã là object, trả về luôn
  if (typeof jsonString === "object") return jsonString

  // Nếu là chuỗi "[object Object]", trả về null
  if (jsonString === "[object Object]") return null

  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn("Failed to parse JSON:", jsonString)
    return null
  }
}

// Lấy đơn hàng theo ID
export async function getOrderById(id: string) {
  try {
    // Lấy thông tin đơn hàng
    const orders = await query(
      `SELECT o.*, 
        v.code as voucher_code, 
        v.type as voucher_type,
        v.value as voucher_value
      FROM orders o
      LEFT JOIN vouchers v ON o.voucher_id = v.id
      WHERE o.id = ?`,
      [id],
    )

    if (orders.length === 0) {
      return null
    }

    const order = orders[0]

    // Lấy danh sách sản phẩm trong đơn hàng
    const items = await query(
      `SELECT oi.*, t.name as template_name, t.image as template_image
       FROM order_items oi
       LEFT JOIN templates t ON oi.template_id = t.id
       WHERE oi.order_id = ?`,
      [id],
    )

    // Lấy danh mục cho mỗi template
    const formattedItems = await Promise.all(
      items.map(async (item) => {
        // Lấy danh mục của template
        const categories = await query(
          `SELECT c.id, c.name
         FROM template_categories tc
         JOIN categories c ON tc.category_id = c.id
         WHERE tc.template_id = ?`,
          [item.template_id],
        )

        return {
          id: item.id,
          orderId: item.order_id,
          templateId: item.template_id,
          previewUrl: item.preview_url,
          imageUrls: safeJsonParse(item.image_urls) || [],
          price: Number.parseFloat(item.price),
          quantity: item.quantity,
          createdAt: new Date(item.created_at),
          template: {
            id: item.template_id,
            name: item.template_name,
            image: item.template_image,
            categories: categories.map((cat) => ({
              id: cat.id,
              name: cat.name,
            })),
          },
        }
      }),
    )

    // Lấy lịch sử giao dịch
    const transactions = await query(`SELECT * FROM order_transactions WHERE order_id = ? ORDER BY created_at DESC`, [
      id,
    ])

    // Lấy lịch sử trạng thái
    const statusHistory = await query(
      `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC`,
      [id],
    )

    // Định dạng lại dữ liệu để trả về
    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      customerCity: order.customer_city,
      customerNote: order.customer_note,
      subtotal: Number.parseFloat(order.subtotal),
      shippingFee: Number.parseFloat(order.shipping_fee),
      discountAmount: order.discount_amount ? Number.parseFloat(order.discount_amount) : 0,
      total: Number.parseFloat(order.total),
      paymentMethod: order.payment_method,
      deliveryOption: order.delivery_option,
      includeDownload: order.include_download === 1,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      voucherId: order.voucher_id,
      voucherCode: order.voucher_code,
      voucherType: order.voucher_type,
      voucherValue: order.voucher_value ? Number.parseFloat(order.voucher_value) : undefined,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      items: formattedItems,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        orderId: tx.order_id,
        transactionId: tx.transaction_id,
        amount: Number.parseFloat(tx.amount),
        provider: tx.provider,
        status: tx.status,
        transactionData: safeJsonParse(tx.transaction_data),
        createdAt: new Date(tx.created_at),
      })),
      statusHistory: statusHistory.map((history) => ({
        id: history.id,
        orderId: history.order_id,
        status: history.status,
        note: history.note,
        createdAt: new Date(history.created_at),
      })),
    }

    return formattedOrder
  } catch (error) {
    console.error("Error in getOrderById:", error)
    throw error
  }
}

// Lấy danh sách đơn hàng
export async function getOrders(page = 1, limit = 10, filters: any = {}): Promise<{ orders: Order[]; total: number }> {
  try {
    const offset = (page - 1) * limit
    let whereClause = "1=1"
    const queryParams: any[] = []

    // Thêm các điều kiện lọc
    if (filters.orderNumber) {
      whereClause += " AND order_number LIKE ?"
      queryParams.push(`%${filters.orderNumber}%`)
    }

    if (filters.customerEmail) {
      whereClause += " AND customer_email LIKE ?"
      queryParams.push(`%${filters.customerEmail}%`)
    }

    if (filters.paymentStatus) {
      whereClause += " AND payment_status = ?"
      queryParams.push(filters.paymentStatus)
    }

    if (filters.orderStatus) {
      whereClause += " AND order_status = ?"
      queryParams.push(filters.orderStatus)
    }

    // Lấy tổng số đơn hàng
    const totalResult = await query(`SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`, queryParams)
    const total = totalResult[0].total

    // Lấy danh sách đơn hàng
    const ordersResult = await query(
      `SELECT 
        id, order_number, customer_name, customer_email, customer_phone,
        subtotal, shipping_fee, discount_amount, total, payment_method, delivery_option,
        payment_status, order_status, created_at, updated_at, voucher_id
      FROM orders 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset],
    )

    // Chuyển đổi dữ liệu từ snake_case sang camelCase
    const orders: Order[] = ordersResult.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      subtotal: Number.parseFloat(order.subtotal),
      shippingFee: Number.parseFloat(order.shipping_fee),
      discountAmount: order.discount_amount ? Number.parseFloat(order.discount_amount) : 0,
      total: Number.parseFloat(order.total),
      paymentMethod: order.payment_method,
      deliveryOption: order.delivery_option,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      voucherId: order.voucher_id,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
    }))

    return { orders, total }
  } catch (error) {
    console.error("Error getting orders:", error)
    throw new Error("Failed to get orders")
  }
}

// Cập nhật trạng thái đơn hàng
export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "processing" | "shipped" | "delivered" | "completed" | "cancelled",
  note?: string,
  createdBy?: string, // Vẫn giữ tham số này để không phải thay đổi các nơi gọi hàm
): Promise<Order> {
  try {
    // Cập nhật trạng thái đơn hàng
    await query(`UPDATE orders SET order_status = ? WHERE id = ?`, [status, orderId])

    // Thêm vào lịch sử trạng thái - đã loại bỏ trường created_by
    await query(`INSERT INTO order_status_history (id, order_id, status, note) VALUES (?, ?, ?, ?)`, [
      uuidv4(),
      orderId,
      status,
      note || null,
    ])

    // Trả về đơn hàng đã cập nhật
    return getOrderById(orderId)
  } catch (error) {
    console.error("Error updating order status:", error)
    throw new Error("Failed to update order status")
  }
}

// Cập nhật trạng thái thanh toán
export async function updatePaymentStatus(
  orderId: string,
  status: "pending" | "paid" | "cod_pending" | "failed",
  transactionData?: any,
): Promise<Order> {
  try {
    // Cập nhật trạng thái thanh toán
    await query(`UPDATE orders SET payment_status = ? WHERE id = ?`, [status, orderId])

    // Nếu có dữ liệu giao dịch, thêm vào bảng order_transactions
    if (transactionData) {
      // Đảm bảo transactionData là chuỗi JSON hợp lệ
      const transactionDataJson =
        typeof transactionData === "string" ? transactionData : JSON.stringify(transactionData)

      // Nếu có email trong transactionData, cập nhật email khách hàng
      if (transactionData.customerEmail) {
        await query(`UPDATE orders SET customer_email = ? WHERE id = ?`, [transactionData.customerEmail, orderId])
      }

      await query(
        `INSERT INTO order_transactions (
          id, order_id, transaction_id, amount, provider, status, transaction_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          orderId,
          transactionData.transactionId || null,
          transactionData.amount || 0,
          transactionData.provider || "bank",
          status === "paid" ? "success" : status === "pending" ? "pending" : "failed",
          transactionDataJson,
        ],
      )
    }

    // Nếu thanh toán thành công, cập nhật trạng thái đơn hàng thành 'processing'
    if (status === "paid") {
      await updateOrderStatus(orderId, "processing", "Thanh toán thành công, đơn hàng đang được xử lý")
    }

    // Trả về đơn hàng đã cập nhật
    return getOrderById(orderId)
  } catch (error) {
    console.error("Error updating payment status:", error)
    throw new Error("Failed to update payment status")
  }
}

// Lấy đơn hàng theo mã đơn hàng
export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  try {
    // Lấy thông tin đơn hàng
    const orderResult = await query(`SELECT id FROM orders WHERE order_number = ?`, [orderNumber])

    if (!orderResult || orderResult.length === 0) {
      return null
    }

    return getOrderById(orderResult[0].id)
  } catch (error) {
    console.error("Error getting order by order number:", error)
    throw new Error("Failed to get order by order number")
  }
}

// Cập nhật email khách hàng
export async function updateOrderEmail(orderId: string, email: string): Promise<Order> {
  try {
    // Cập nhật email khách hàng
    await query(`UPDATE orders SET customer_email = ? WHERE id = ?`, [email, orderId])

    // Trả về đơn hàng đã cập nhật
    return getOrderById(orderId)
  } catch (error) {
    console.error("Error updating order email:", error)
    throw new Error("Failed to update order email")
  }
}
