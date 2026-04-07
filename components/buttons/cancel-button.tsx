'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleX } from 'lucide-react'

export default function CancelButton({ duration = 30 }: { duration?: number }) {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  const radius = 30
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const start = Date.now()

    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const percent = Math.min(elapsed / duration, 1)

      setProgress(percent)

      if (percent >= 1) {
        clearInterval(interval)
        router.push('/') // tự click
      }
    }, 50)

    return () => clearInterval(interval)
  }, [router])

  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="fixed right-8 bottom-8 flex flex-col items-center gap-3" onClick={() => router.push('/')}>
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* vòng tròn nền */}
        <svg className="absolute w-full h-full -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="#eee"
            strokeWidth="4"
            fill="transparent"
          />
          {/* vòng chạy */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="#ff4d4f"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* nút */}
        <div className="flex flex-col items-center">
          <CircleX className="w-10 h-10" />
        </div>
      </div>

      <p className="text-2xl">Hủy</p>
    </div>
  )
}