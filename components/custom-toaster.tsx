"use client"

import { useToast } from "@/hooks/use-toast"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"

export function CustomToaster() {
  // Kích hoạt hook useToast để đảm bảo context được khởi tạo
  const { toast } = useToast()

  return <ShadcnToaster />
}
