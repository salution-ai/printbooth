"use client"

import { useEffect } from "react"

interface CopyNotificationProps {
  show: boolean
  message: string
  onClose: () => void
}

export function CopyNotification({ show, message, onClose }: CopyNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fadeInUp">
      <div className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        {message}
      </div>
    </div>
  )
}
