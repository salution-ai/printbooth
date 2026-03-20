"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function CassoSetupPage() {
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")
  const [connectionMessage, setConnectionMessage] = useState("")

  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "success" | "error">("idle")
  const [webhookMessage, setWebhookMessage] = useState("")
  const [webhookData, setWebhookData] = useState<any>(null)

  // Kiểm tra kết nối với Casso API
  const checkConnection = async () => {
    setIsCheckingConnection(true)
    setConnectionStatus("idle")
    setConnectionMessage("")

    try {
      const response = await fetch("/api/casso/check-connection")
      const data = await response.json()

      if (data.success) {
        setConnectionStatus("success")
        setConnectionMessage(data.message)
      } else {
        setConnectionStatus("error")
        setConnectionMessage(data.message)
      }
    } catch (error) {
      setConnectionStatus("error")
      setConnectionMessage(error instanceof Error ? error.message : "Lỗi không xác định")
    } finally {
      setIsCheckingConnection(false)
    }
  }

  // Đăng ký webhook với Casso
  const registerWebhook = async () => {
    setIsRegisteringWebhook(true)
    setWebhookStatus("idle")
    setWebhookMessage("")
    setWebhookData(null)

    try {
      const response = await fetch("/api/casso/register-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setWebhookStatus("success")
        setWebhookMessage(data.message)
        setWebhookData(data.data)
      } else {
        setWebhookStatus("error")
        setWebhookMessage(data.message)
      }
    } catch (error) {
      setWebhookStatus("error")
      setWebhookMessage(error instanceof Error ? error.message : "Lỗi không xác định")
    } finally {
      setIsRegisteringWebhook(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 gradient-text">Cài đặt Casso</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Kiểm tra kết nối */}
          <Card>
            <CardHeader>
              <CardTitle>Kiểm tra kết nối Casso API</CardTitle>
              <CardDescription>Kiểm tra xem API key Casso có hoạt động không</CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStatus === "success" && (
                <div className="flex items-center p-4 mb-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-green-700">{connectionMessage}</p>
                </div>
              )}

              {connectionStatus === "error" && (
                <div className="flex items-center p-4 mb-4 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{connectionMessage}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={checkConnection} disabled={isCheckingConnection}>
                {isCheckingConnection ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  "Kiểm tra kết nối"
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Đăng ký webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Đăng ký Webhook</CardTitle>
              <CardDescription>Đăng ký webhook để nhận thông báo khi có giao dịch mới</CardDescription>
            </CardHeader>
            <CardContent>
              {webhookStatus === "success" && (
                <div className="flex flex-col p-4 mb-4 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-green-700">{webhookMessage}</p>
                  </div>

                  {webhookData && (
                    <div className="mt-2 p-2 bg-white rounded border border-green-100">
                      <p className="text-sm font-medium">Webhook ID: {webhookData.webhook?.id}</p>
                      <p className="text-sm">URL: {webhookData.webhook?.param1}</p>
                    </div>
                  )}
                </div>
              )}

              {webhookStatus === "error" && (
                <div className="flex items-center p-4 mb-4 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{webhookMessage}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={registerWebhook} disabled={isRegisteringWebhook}>
                {isRegisteringWebhook ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : (
                  "Đăng ký webhook"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Hướng dẫn */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Hướng dẫn cài đặt</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Đảm bảo bạn đã cấu hình biến môi trường{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded">CASSO_API_KEY</code> và{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded">CASSO_SECURE_TOKEN</code> trong dự án của bạn.
              </li>
              <li>Kiểm tra kết nối với Casso API bằng cách nhấn nút "Kiểm tra kết nối".</li>
              <li>Nếu kết nối thành công, đăng ký webhook bằng cách nhấn nút "Đăng ký webhook".</li>
              <li>
                Sau khi đăng ký webhook thành công, Casso sẽ gửi thông báo đến endpoint{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded">/api/payment/webhook</code> khi có giao dịch mới.
              </li>
            </ol>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
