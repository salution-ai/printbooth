import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const secretKey = new TextEncoder().encode(JWT_SECRET)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  console.log("Middleware running, path:", path)

  // Kiểm tra nếu path bắt đầu bằng /admin và không phải là /admin/login
  if (path.startsWith("/admin") && path !== "/admin/login") {
    const token = request.cookies.get("admin_token")?.value

    // Nếu không có token, chuyển hướng đến trang đăng nhập
    if (!token) {
      console.log("No token found, redirecting to login")
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    try {
      // Xác thực token
      console.log("Token to verify:", token)
      const { payload } = await jwtVerify(token, secretKey)
      console.log("Token decoded successfully:", payload)
      return NextResponse.next()
    } catch (error) {
      // Token không hợp lệ, chuyển hướng đến trang đăng nhập
      console.log("Token verification failed:", error)
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }

  // Bảo vệ API admin
  if (path.startsWith("/api/admin") && path !== "/api/admin/auth" && !path.match(/\/api\/admin\/templates\/[^/]+/)) {
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await jwtVerify(token, secretKey)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
