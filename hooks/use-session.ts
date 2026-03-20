"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Kiểm tra xem đã có sessionId trong localStorage chưa
    let id = localStorage.getItem("photolab_session_id")

    // Nếu chưa có, tạo mới và lưu vào localStorage
    if (!id) {
      id = uuidv4()
      localStorage.setItem("photolab_session_id", id)
    }

    setSessionId(id)
    setIsLoading(false)
  }, [])

  return { sessionId, isLoading }
}
