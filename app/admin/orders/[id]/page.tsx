"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  useEffect(() => {
    // Chuyển hướng về trang danh sách đơn hàng
    router.push("/admin/orders")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
}
