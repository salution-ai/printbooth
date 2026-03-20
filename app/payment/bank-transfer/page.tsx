"use client"

import { Suspense } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import BankTransferContent from "./bank-transfer-content"

export default function BankTransferPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-grow flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }
      >
        <BankTransferContent />
      </Suspense>
      <Footer />
    </div>
  )
}
