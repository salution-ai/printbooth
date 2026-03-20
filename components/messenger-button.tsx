"use client"

import { useEffect, useState } from "react"
import MessengerChat from "./messenger-chat"

// Thêm component MessengerIcon
function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
      className={className}
    >
      <path
        fill="#448AFF"
        d="M24,4C13.5,4,5,12.1,5,22c0,5.2,2.3,9.8,6,13.1V44l7.8-4.7c1.6,0.4,3.4,0.7,5.2,0.7c10.5,0,19-8.1,19-18C43,12.1,34.5,4,24,4z"
      ></path>
      <path fill="#FFF" d="M12 28L22 17 27 22 36 17 26 28 21 23z"></path>
    </svg>
  )
}

export default function MessengerButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Facebook Page ID - Thay thế bằng ID của fanpage của bạn
  const FACEBOOK_PAGE_ID = "574895329038952" // Đây là ID mẫu, hãy thay thế bằng ID thực của bạn

  // Hiển thị nút sau khi component được mount để tránh hydration mismatch
  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleMessengerClick = () => {
    // Nếu FB SDK đã được tải
    if (window.FB) {
      try {
        if (isChatOpen) {
          window.FB.CustomerChat.hide()
        } else {
          window.FB.CustomerChat.show(true) // true để hiển thị dialog chat
        }
        setIsChatOpen(!isChatOpen)
      } catch (e) {
        console.error("Error toggling customer chat:", e)
        // Fallback: mở Messenger trong tab mới nếu có lỗi
        window.open("https://m.me/tuliephotolab.online", "_blank")
      }
    } else {
      // Fallback: mở Messenger trong tab mới nếu FB SDK chưa được tải
      window.open("https://m.me/tuliephotolab.online", "_blank")
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* Messenger Chat Plugin */}
      <MessengerChat
        pageId={FACEBOOK_PAGE_ID}
        themeColor="#0084ff"
        loggedInGreeting="Xin chào! Bạn cần hỗ trợ gì về dịch vụ của Tulie PhotoLab không?"
        loggedOutGreeting="Xin chào! Bạn cần hỗ trợ gì về dịch vụ của Tulie PhotoLab không?"
        greetingDialogDisplay="hide" // Ẩn dialog chào mừng ban đầu, chỉ hiển thị khi người dùng nhấp vào nút
      />

      {/* Nút Messenger */}
      <button
        onClick={handleMessengerClick}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full  text-white transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        aria-label="Nhắn tin qua Messenger"
      >
        <MessengerIcon className="h-14 w-14" />
        <span className="absolute -top-0 -right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          1
        </span>
      </button>
    </>
  )
}
