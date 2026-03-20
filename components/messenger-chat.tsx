"use client"

import { useEffect, useState } from "react"

declare global {
  interface Window {
    fbAsyncInit: () => void
    FB: any
  }
}

type MessengerChatProps = {
  pageId: string
  themeColor?: string
  loggedInGreeting?: string
  loggedOutGreeting?: string
  greetingDialogDisplay?: "show" | "hide" | "fade"
  greetingDialogDelay?: number
}

export default function MessengerChat({
  pageId,
  themeColor = "#0A7CFF",
  loggedInGreeting = "Xin chào! Bạn cần hỗ trợ gì không?",
  loggedOutGreeting = "Xin chào! Bạn cần hỗ trợ gì không?",
  greetingDialogDisplay = "show",
  greetingDialogDelay = 5,
}: MessengerChatProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)

  useEffect(() => {
    // Chỉ tải SDK một lần
    if (document.getElementById("facebook-jssdk")) {
      setIsSDKLoaded(true)
      return
    }

    // Tải Facebook SDK
    const script = document.createElement("script")
    script.id = "facebook-jssdk"
    script.src = "https://connect.facebook.net/vi_VN/sdk.js"
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    document.body.appendChild(script)

    // Khởi tạo Facebook SDK
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: "2680937208774123",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v18.0",
      })
      setIsSDKLoaded(true)
    }

    // Cleanup khi component unmount
    return () => {
      if (window.FB) {
        try {
          window.FB.CustomerChat.hide()
        } catch (e) {
          console.error("Error hiding customer chat:", e)
        }
      }
    }
  }, [])

  return (
    <>
      <div id="fb-root"></div>
      <div
        id="fb-customer-chat"
        className="fb-customerchat"
        data-page_id={pageId}
        data-attribution="biz_inbox"
        data-theme_color={themeColor}
        data-logged_in_greeting={loggedInGreeting}
        data-logged_out_greeting={loggedOutGreeting}
        data-greeting_dialog_display={greetingDialogDisplay}
        data-greeting_dialog_delay={greetingDialogDelay}
      ></div>
    </>
  )
}
