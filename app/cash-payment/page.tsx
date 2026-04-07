"use client"
import { ArrowLeft, BanknoteArrowUp } from "lucide-react";
import BillCard from "./bill-card/page";
import { useRouter } from "next/navigation";
import BackButton from "@/components/buttons/back-button";
import CancelButton from "@/components/buttons/cancel-button";

export default function CashPaymentPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col gap-30 bg-[#FFF7F9] text-[#B84F6F] items-center justify-center text-4xl font-bold">
      <BanknoteArrowUp className="w-40 h-40" />
      <div className="flex flex-col gap-6 items-center">
        <p>Vui lòng cho tiền vào khe nhận tiền</p>
        <p>Số tiền: 50.000 VNĐ</p>
        <div>
          <p>ĐÃ NHẬN: 0 VND</p>
        </div>
      </div>

      <div className="px-12 py-12 flex flex-col gap-6 items-center">
        <p className="text-2xl">Chấp nhận thanh toán các mệnh giá</p>
        <div className="flex gap-12 justify-center flex-wrap text-xl">
          <BillCard value="10000" backgroundColor="#d4edda" />
          <BillCard value="20000" backgroundColor="#cce5ff" />
          <BillCard value="50000" backgroundColor="#f8d7da" />
          <BillCard value="100000" backgroundColor="#e2d5f1" />
        </div>
      </div>

      <div className="screen3-mock-bills" id="screen3-mock-bills" hidden>
        <p className="screen3-mock-bills-label">Mô phỏng nhét tiền (khi lỗi kết nối)</p>
        <div className="screen3-mock-bills-btns">
          <button type="button" className="screen3-mock-btn" data-value="10000">10K</button>
          <button type="button" className="screen3-mock-btn" data-value="20000">20K</button>
          <button type="button" className="screen3-mock-btn" data-value="50000">50K</button>
          <button type="button" className="screen3-mock-btn" data-value="100000">100K</button>
        </div>
      </div>
      <BackButton />
      <CancelButton />
    </div>
  )
}