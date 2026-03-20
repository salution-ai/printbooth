"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useDevToolsDetector } from "@/hooks/use-devtools-detector"
import { AlertTriangle } from "lucide-react"

interface DevToolsProtectorProps {
  children: ReactNode
  fallback?: ReactNode
  showWarning?: boolean
}

export default function DevToolsProtector({ children, fallback, showWarning = true }: DevToolsProtectorProps) {
  const isDevToolsOpen = useDevToolsDetector()
  const [isClient, setIsClient] = useState(false)

  // Tránh hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Nếu chưa hydrate, hiển thị children
  if (!isClient) {
    return <>{children}</>
  }

  // Nếu DevTools được mở và có fallback, hiển thị fallback
  if (isDevToolsOpen) {
    if (fallback) {
      return <>{fallback}</>
    }

    // Nếu không có fallback nhưng muốn hiển thị cảnh báo
    if (showWarning) {
      return (
        <div className="relative w-full h-full min-h-[200px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center p-4">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-700">Phát hiện hành vi đáng ngờ!</h3>
            <p className="text-red-600 mt-1">Vui lòng đóng DevTools để tiếp tục xem nội dung này.</p>
          </div>
        </div>
      )
    }
  }

  // Mặc định hiển thị children
  return <>{children}</>
}
