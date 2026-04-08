"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"

export default function FinishPage({
  searchParams,
}: {
  searchParams: { code?: string; img?: string }
}) {
  const code = searchParams.code ?? ""
  const img = searchParams.img ?? ""

  const downloadUrl = useMemo(() => {
    if (img) return img
    if (!code) return ""
    return `https://salution.net/print-up?code=${encodeURIComponent(code)}`
  }, [code, img])

  const qrImageUrl = useMemo(() => {
    if (!downloadUrl) return ""
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(downloadUrl)}`
  }, [downloadUrl])

  return (
    <div className="min-h-screen bg-[#FFF7F9] text-[#B84F6F]">
      <div className="container mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold">Cảm ơn bạn</h1>
          <p className="text-sm font-medium text-[#B84F6F]/80">
            Quét QR bên dưới để tải ảnh về điện thoại.
          </p>
        </div>

        {qrImageUrl ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#B84F6F] bg-white/70 p-6">
            <Image
              src={qrImageUrl}
              alt="QR tải ảnh"
              width={260}
              height={260}
              unoptimized
              className="h-[260px] w-[260px] rounded bg-white p-2"
            />
            <div className="text-xs font-semibold">
              Mã phiên: <span className="font-mono">{code || "---"}</span>
            </div>
            {downloadUrl && (
              <div className="break-all text-xs font-medium text-[#B84F6F]/80">
                {downloadUrl}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-[#B84F6F] bg-white/70 p-6 text-sm font-semibold">
            Không có mã để tạo QR.
          </div>
        )}

        <Link
          href="/start"
          className="mt-2 inline-flex rounded-full bg-[#B84F6F] px-6 py-3 text-sm font-bold text-white hover:bg-[#B84F6F]/90"
        >
          Kết thúc
        </Link>
      </div>
    </div>
  )
}

