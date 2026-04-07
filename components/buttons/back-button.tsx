'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ duration = 30 }: { duration?: number }) {
  const router = useRouter()
  return (
    <div className="fixed left-8 bottom-8 flex flex-col items-center gap-3" onClick={() => router.back()}>
      <div className="flex flex-col items-center border border-[#B84F6F] rounded-full p-4">
        <ArrowLeft className="w-10 h-10" />
      </div>
      <p className="text-2xl">Quay lại</p>
    </div>
  )
}