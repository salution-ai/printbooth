import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"

export const formatDate = (date: Date) => {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi })
}

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(
    () => {
      toast({
        title: "Thành công",
        description: "Đã sao chép văn bản vào clipboard",
      })
      return true
    },
    (err) => {
      console.error("Could not copy text: ", err)
      return false
    },
  )
}

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(price)
}