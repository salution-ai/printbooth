import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import MessengerButton from "@/components/messenger-button"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script" // ✅ Thêm dòng này

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PhotoLab - Tạo ảnh ghép đẹp mắt trong vài phút",
  description: "Tạo ảnh ghép đẹp mắt trong vài phút với công cụ chỉnh sửa ảnh trực tuyến của chúng tôi.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* ✅ Facebook Pixel Script */}
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '503980376070560');
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* ✅ Pixel fallback cho người tắt JS */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=503980376070560&ev=PageView&noscript=1"
          />
        </noscript>

        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <MessengerButton />
        <Toaster />
      </body>
    </html>
  )
}
