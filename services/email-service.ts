import nodemailer from "nodemailer"
import type { CartItem } from "./cloudinary-service"

// Hàm loại bỏ dấu cách từ mật khẩu
function cleanPassword(password: string): string {
  return password.replace(/\s+/g, "")
}

// Cấu hình transporter cho Nodemailer với mail domain doanh nghiệp
const transporter = nodemailer.createTransport({
  host: "pro08.emailserver.vn",
  port: 465,
  secure: true, // true cho port 465, false cho các port khác
  auth: {
    user: process.env.EMAIL_USER || "info@tuliemedia.com",
    pass: process.env.EMAIL_PASSWORD ? cleanPassword(process.env.EMAIL_PASSWORD) : "your-app-password-here",
  },
  debug: true, // Bật chế độ debug để xem thông tin chi tiết
})

// Interface cho thông tin đơn hàng
interface OrderInfo {
  orderNumber: string
  customerName?: string
  customerEmail: string
  items?: CartItem[]
  total?: number
  paymentMethod?: string
  deliveryOption?: "download" | "print"
  includeDownloadLink?: boolean
  downloadUrl?: string // Thêm trường này cho đơn hàng miễn phí
  customerInfo?: {
    name?: string
    email?: string
    phone?: string
    address?: string
  }
  shippingFee?: number
  discount?: number
  subtotal?: number
}

/**
 * Gửi email xác nhận đơn hàng kèm link tải ảnh
 */
export async function sendOrderConfirmationEmail(orderInfo: OrderInfo): Promise<boolean> {
  try {
    console.log("Sending order confirmation email with data:", JSON.stringify(orderInfo, null, 2))
    console.log(
      "Using email credentials - User:",
      process.env.EMAIL_USER,
      "Password length:",
      process.env.EMAIL_PASSWORD?.length,
    )

    // Đảm bảo các trường bắt buộc tồn tại
    if (!orderInfo.orderNumber || !orderInfo.customerEmail) {
      console.error("Missing required fields for sending email:", { orderInfo })
      return false
    }

    // Nếu có downloadUrl (đơn hàng miễn phí), sử dụng hàm sendFreeOrderEmail
    if (orderInfo.downloadUrl) {
      return await sendFreeOrderEmail(orderInfo.customerEmail, orderInfo.orderNumber, orderInfo.downloadUrl)
    }

    // Đảm bảo items là một mảng, nếu không thì khởi tạo mảng rỗng
    const items = Array.isArray(orderInfo.items) ? orderInfo.items : []
    console.log("Items for email:", items)

    // Chỉ gửi link tải ảnh nếu là đơn hàng tải xuống hoặc đơn hàng in có includeDownloadLink
    const shouldSendDownloadLinks =
      orderInfo.deliveryOption === "download" || (orderInfo.deliveryOption === "print" && orderInfo.includeDownloadLink)

    // Sửa lại logic lọc các item có thể tải xuống
    // Không dựa vào productType mà chỉ kiểm tra xem item có previewUrl không
    const downloadableItems = shouldSendDownloadLinks ? items.filter((item) => item && item.previewUrl) : []

    console.log("Downloadable items:", downloadableItems)

    // Lấy thông tin khách hàng
    const customerName = orderInfo.customerName || orderInfo.customerInfo?.name || "Quý khách"
    const customerEmail = orderInfo.customerEmail || orderInfo.customerInfo?.email || ""
    const customerPhone = orderInfo.customerInfo?.phone || ""
    const customerAddress = orderInfo.customerInfo?.address || ""

    // Tính toán các giá trị tài chính
    const subtotal = orderInfo.subtotal || orderInfo.total || 0
    const shippingFee = orderInfo.shippingFee || 0
    const discount = orderInfo.discount || 0
    const total = orderInfo.total || subtotal + shippingFee - discount

    // Format các giá trị tiền tệ
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)
    }

    // Tạo nội dung HTML cho email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #e61a61;">Tulie PhotoLab</h1>
          <p style="font-size: 18px; color: #333;">Xác nhận đơn hàng</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Xin chào <strong>${customerName}</strong>,</p>
          <p>Cảm ơn bạn đã đặt hàng tại Tulie PhotoLab. Đơn hàng của bạn đã được xác nhận và đang được xử lý.</p>
        </div>

        <!-- Bảng thông tin đơn hàng -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th colspan="2" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Thông tin đơn hàng
            </th>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; width: 40%;">Mã đơn hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">${orderInfo.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Ngày đặt hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${new Date().toLocaleDateString("vi-VN")}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Phương thức thanh toán:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${
              orderInfo.paymentMethod === "bank"
                ? "Chuyển khoản ngân hàng"
                : orderInfo.paymentMethod === "cod"
                  ? "Thanh toán khi nhận hàng (COD)"
                  : "Không xác định"
            }</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Phương thức giao hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${
              orderInfo.deliveryOption === "download" ? "Tải xuống" : "Giao hàng tận nơi"
            }</td>
          </tr>
        </table>

        <!-- Bảng thông tin khách hàng -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th colspan="2" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Thông tin khách hàng
            </th>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; width: 40%;">Họ tên:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Email:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${customerEmail}</td>
          </tr>
          ${
            customerPhone
              ? `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Số điện thoại:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${customerPhone}</td>
          </tr>
          `
              : ""
          }
          ${
            customerAddress && orderInfo.deliveryOption === "print"
              ? `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Địa chỉ giao hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${customerAddress}</td>
          </tr>
          `
              : ""
          }
        </table>

        <!-- Bảng chi tiết sản phẩm -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th colspan="3" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Chi tiết sản phẩm
            </th>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left;">Sản phẩm</th>
            <th style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">Số lượng</th>
            <th style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">Thành tiền</th>
          </tr>
          ${items
            .map(
              (item, index) => `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">
              <div style="font-weight: bold;">${item.template?.name || `Ảnh ghép ${item.templateId || ""}`}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">Mã sản phẩm: ${item.templateId || "N/A"}</div>
            </td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">1</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(
              item.price || 0,
            )}</td>
          </tr>
          `,
            )
            .join("")}
          
          <!-- Tổng cộng -->
          <tr>
            <td colspan="2" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: bold;">Tạm tính:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(
              subtotal,
            )}</td>
          </tr>
          ${
            shippingFee > 0
              ? `
          <tr>
            <td colspan="2" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: bold;">Phí vận chuyển:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(
              shippingFee,
            )}</td>
          </tr>
          `
              : ""
          }
          ${
            discount > 0
              ? `
          <tr>
            <td colspan="2" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: bold;">Giảm giá:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #e61a61;">-${formatCurrency(
              discount,
            )}</td>
          </tr>
          `
              : ""
          }
          <tr style="background-color: #f9f9f9;">
            <td colspan="2" style="padding: 12px 15px; text-align: right; font-weight: bold; font-size: 16px;">Tổng cộng:</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: bold; font-size: 16px; color: #e61a61;">${formatCurrency(
              total,
            )}</td>
          </tr>
        </table>
        
        ${
          shouldSendDownloadLinks && downloadableItems.length > 0
            ? `
          <!-- Bảng link tải ảnh -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
            <tr style="background-color: #f5f5f5;">
              <th colspan="2" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
                Link tải ảnh của bạn
              </th>
            </tr>
            ${downloadableItems
              .map(
                (item, index) => `
            <tr>
              <td style="padding: 15px; border-bottom: ${
                index < downloadableItems.length - 1 ? "1px solid #e0e0e0" : "none"
              };">
                <div style="font-weight: bold; margin-bottom: 10px;">Ảnh ${index + 1}: ${
                  item.template?.name || `Ảnh ghép ${item.templateId || ""}`
                }</div>
                
                <div style="text-align: center; margin-bottom: 15px;">
                  <img src="${
                    item.previewUrl || "#"
                  }" alt="Ảnh ghép" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
                </div>
                
                <div style="text-align: center;">
                  <a href="${
                    item.previewUrl || "#"
                  }" target="_blank" style="display: inline-block; padding: 10px 15px; background-color: #e61a61; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Tải xuống ảnh</a>
                </div>
              </td>
            </tr>
            `,
              )
              .join("")}
          </table>
        `
            : ""
        }
        
        ${
          orderInfo.deliveryOption === "print"
            ? `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            <h2 style="color: #e61a61; font-size: 18px; margin-top: 0;">Thông tin giao hàng</h2>
            <p>Đơn hàng của bạn sẽ được giao trong vòng 3-5 ngày làm việc.</p>
            ${orderInfo.paymentMethod === "cod" ? "<p>Vui lòng chuẩn bị tiền mặt để thanh toán khi nhận hàng.</p>" : ""}
          </div>
        `
            : ""
        }
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 14px; color: #666;">
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email: info@tuliemedia.com</p>
          <p>&copy; ${new Date().getFullYear()} Tulie PhotoLab. All rights reserved.</p>
        </div>
      </div>
    `

    // Cấu hình email
    const mailOptions = {
      from: `"Tulie PhotoLab" <${process.env.EMAIL_USER || "info@tuliemedia.com"}>`,
      to: orderInfo.customerEmail,
      subject: `[Tulie PhotoLab] Xác nhận đơn hàng #${orderInfo.orderNumber}`,
      html: htmlContent,
    }

    // Gửi email
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

// Sửa lại hàm sendFreeOrderEmail để bổ sung tên và số điện thoại, đồng thời hỗ trợ nhiều sản phẩm

// Thay thế hàm sendFreeOrderEmail hiện tại bằng hàm mới này:
/**
 * Gửi email thông báo đơn hàng miễn phí
 */
export async function sendFreeOrderEmail(
  email: string,
  orderNumber: string,
  downloadImages: { templateName: string; link: string } | { templateName: string; link: string }[],
  customerName = "",
  customerPhone = "",
): Promise<boolean> {
  try {
    console.log("Sending free order email to:", email, "with order number:", orderNumber)

    if (!email || !orderNumber || (!downloadImages && !Array.isArray(downloadImages))) {
      console.error("Missing required fields for sending free order email:", { email, orderNumber, downloadImages })
      return false
    }

    // Chuyển đổi downloadUrls thành mảng nếu là string
    const imagesArray = Array.isArray(downloadImages) ? downloadImages : [downloadImages]

    // Tạo nội dung HTML cho email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #e61a61;">Tulie PhotoLab</h1>
          <p style="font-size: 18px; color: #333;">Đơn hàng miễn phí của bạn</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Xin chào ${customerName || "Quý khách"},</p>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của Tulie PhotoLab. Dưới đây là ảnh miễn phí của bạn.</p>
        </div>

        <!-- Bảng thông tin đơn hàng -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th colspan="2" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Thông tin đơn hàng
            </th>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; width: 40%;">Mã đơn hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Ngày đặt hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${new Date().toLocaleDateString("vi-VN")}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Loại đơn hàng:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">Miễn phí</td>
          </tr>
        </table>

        <!-- Bảng thông tin khách hàng -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th colspan="2" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Thông tin khách hàng
            </th>
          </tr>
          ${
            customerName
              ? `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; width: 40%;">Họ tên:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${customerName}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; width: 40%;">Email:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${email}</td>
          </tr>
          ${
            customerPhone
              ? `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; width: 40%;">Số điện thoại:</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">${customerPhone}</td>
          </tr>
          `
              : ""
          }
        </table>
        
        <!-- Bảng chi tiết sản phẩm -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th colspan="3" style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Chi tiết sản phẩm
            </th>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left;">Sản phẩm</th>
            <th style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">Số lượng</th>
            <th style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">Thành tiền</th>
          </tr>
          ${imagesArray
            .map(
              (image, index) => `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0;">
              <div style="font-weight: bold;">Ảnh ghép miễn phí ${image.templateName}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">Mã sản phẩm: FREE-${orderNumber}-${index + 1}</div>
            </td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: center;">1</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">0 ₫</td>
          </tr>
          `,
            )
            .join("")}
          <tr style="background-color: #f9f9f9;">
            <td colspan="2" style="padding: 12px 15px; text-align: right; font-weight: bold; font-size: 16px;">Tổng cộng:</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: bold; font-size: 16px; color: #e61a61;">0 ₫</td>
          </tr>
        </table>
        
        <!-- Bảng link tải ảnh -->
        ${imagesArray
          .map(
            (image, index) => `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e0e0e0;">
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 16px; color: #333;">
              Ảnh ${index + 1}: ${image.templateName}
            </th>
          </tr>
          <tr>
            <td style="padding: 15px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="${image.link}" alt="Ảnh miễn phí ${index + 1}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
              </div>
              
              <div style="text-align: center;">
                <a href="${image.link}" download style="display: inline-block; padding: 12px 20px; background-color: #e61a61; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Tải xuống ảnh ${index + 1}</a>
              </div>
            </td>
          </tr>
        </table>
        `,
          )
          .join("")}
        
        <p style="font-size: 14px; color: #666; margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
          <strong>Lưu ý:</strong> Link tải ảnh có hiệu lực trong vòng 7 ngày. Vui lòng tải xuống và lưu trữ ảnh của bạn.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 14px; color: #666;">
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email: info@tuliemedia.com</p>
          <p>&copy; ${new Date().getFullYear()} Tulie PhotoLab. All rights reserved.</p>
        </div>
      </div>
    `

    // Cấu hình email
    const mailOptions = {
      from: `"Tulie PhotoLab" <${process.env.EMAIL_USER || "info@tuliemedia.com"}>`,
      to: email,
      subject: `[Tulie PhotoLab] Ảnh miễn phí của bạn #${orderNumber}`,
      html: htmlContent,
    }
    console.log("Mail options:", mailOptions)

    // Gửi email
    const info = await transporter.sendMail(mailOptions)
    console.log("Free order email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending free order email:", error)
    return false
  }
}
