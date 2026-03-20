import { query } from "./mysql"
import { jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const secretKey = new TextEncoder().encode(JWT_SECRET)

export async function verifyCredentials(username: string, password: string) {
  try {
    const users = await query("SELECT id, username, password FROM admin_users WHERE username = ?", [username])

    if (users.length === 0) {
      return null
    }

    const user = users[0]

    // Kiểm tra mật khẩu cố định cho demo
    if (username === "admin" && password === "TulieM@dia2") {
      return {
        id: user.id,
        username: user.username,
      }
    }

    // Trong trường hợp thực tế, sẽ so sánh mật khẩu đã hash
    // const match = await bcrypt.compare(password, user.password);
    // if (!match) {
    //   return null;
    // }

    return {
      id: user.id,
      username: user.username,
    }
  } catch (error) {
    console.error("Error verifying credentials:", error)
    return null
  }
}

export async function verifyToken(token: string) {
  try {
    await jwtVerify(token, secretKey)
    return true
  } catch (error) {
    console.error("Token verification failed:", error)
    return false
  }
}

// Thêm function verifyAuth để sử dụng trong API routes
export async function verifyAuth() {
  try {
    const token = cookies().get("admin_token")?.value

    if (!token) {
      return { success: false, error: "Unauthorized" }
    }

    const isValid = await verifyToken(token)

    if (!isValid) {
      return { success: false, error: "Invalid token" }
    }

    // Decode token để lấy thông tin user
    const decoded = await jwtVerify(token, secretKey)

    return {
      success: true,
      user: {
        id: decoded.payload.id,
        username: decoded.payload.username,
        email: decoded.payload.email || "admin@example.com", // Fallback nếu không có email
      },
    }
  } catch (error) {
    console.error("Auth verification failed:", error)
    return { success: false, error: "Authentication failed" }
  }
}
