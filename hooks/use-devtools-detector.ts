"use client"

import { useState, useEffect, useRef } from "react"

// Hook để phát hiện khi DevTools được mở
export function useDevToolsDetector() {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)
  const devToolsTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const detectDevTools = () => {
      // Phương pháp 1: Phát hiện thông qua console.log
      const consoleCheck = () => {
        const startTime = performance.now()
        console.log("%c", "font-size:0;padding:" + Array(1000).join("A"))
        const endTime = performance.now()
        return endTime - startTime > 100 // DevTools mở làm chậm console.log
      }

      // Phương pháp 2: Phát hiện thông qua sự thay đổi kích thước cửa sổ
      const widthCheck = () => {
        const widthThreshold = 160 // Ngưỡng phát hiện
        const heightThreshold = 160

        // Kiểm tra sự khác biệt giữa kích thước cửa sổ bên trong và bên ngoài
        return (
          Math.abs(window.outerWidth - window.innerWidth) > widthThreshold ||
          Math.abs(window.outerHeight - window.innerHeight) > heightThreshold
        )
      }

      // Phương pháp 3: Phát hiện thông qua debugger
      const debuggerCheck = () => {
        let isDebuggerEnabled = false
        try {
          // Đặt một debugger statement và đo thời gian thực thi
          const startTime = performance.now()
          // eslint-disable-next-line no-debugger
          debugger
          const endTime = performance.now()
          isDebuggerEnabled = endTime - startTime > 100
        } catch (e) {
          // Bỏ qua lỗi
        }
        return isDebuggerEnabled
      }

      // Phương pháp 4: Phát hiện thông qua Firebug
      const firebugCheck = () => {
        return (
          window.console &&
          (window.console.firebug || window.console.table) &&
          /firebug/i.test(window.console.table?.toString() || "")
        )
      }

      // Phương pháp 5: Phát hiện thông qua thuộc tính __REACT_DEVTOOLS_GLOBAL_HOOK__
      const reactDevToolsCheck = () => {
        return typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined"
      }

      // Kết hợp các phương pháp
      // const isOpen = consoleCheck() || widthCheck() || debuggerCheck() || firebugCheck() || reactDevToolsCheck()
      const isOpen = false

      // Cập nhật state nếu trạng thái thay đổi
      if (isOpen !== isDevToolsOpen) {
        setIsDevToolsOpen(isOpen)
      }
    }

    // Kiểm tra ngay lập tức
    detectDevTools()

    // Thiết lập kiểm tra định kỳ
    const intervalId = setInterval(detectDevTools, 1000)

    // Kiểm tra khi cửa sổ thay đổi kích thước (có thể do mở DevTools)
    const handleResize = () => {
      // Sử dụng debounce để tránh gọi quá nhiều lần
      if (devToolsTimeout.current) {
        clearTimeout(devToolsTimeout.current)
      }
      devToolsTimeout.current = setTimeout(detectDevTools, 500)
    }

    window.addEventListener("resize", handleResize)

    // Kiểm tra khi tab được focus lại (người dùng có thể đã mở DevTools trong lúc đó)
    window.addEventListener("focus", detectDevTools)

    // Cleanup
    return () => {
      clearInterval(intervalId)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("focus", detectDevTools)
      if (devToolsTimeout.current) {
        clearTimeout(devToolsTimeout.current)
      }
    }
  }, [isDevToolsOpen])

  return isDevToolsOpen
}
