"use client";

import PhysicalButton from "@/components/buttons/physical-button";
import { BanknoteArrowUp, CreditCard } from "lucide-react";
import { Pacifico } from "next/font/google";
import { useRouter } from "next/navigation";
import CancelButton from "../../components/buttons/cancel-button";


const pacifico = Pacifico({
  weight: ["400"],
});

export default function PaymentMethodsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col gap-30 bg-[#FFF7F9] text-[#B84F6F] items-center justify-center text-4xl font-bold">
      <div className={`${pacifico.className} text-7xl`}>
        Chọn phương thức thanh toán mong muốn
      </div>
      <div className="flex gap-12 items-center justify-center w-full">
        <PhysicalButton
          className="bg-[#FFD8E9] p-10 w-[30%] flex flex-col gap-6"
          shadowColor="#962d70"
          onClick={() => router.push('/cash-payment')}
        >
          <div className="flex items-center justify-center">
            <BanknoteArrowUp className="w-40 h-40 group-hover:animate-spin-once" />
          </div>
          <div>Tiền mặt</div>
        </PhysicalButton>
        <PhysicalButton
          className="bg-[#FFD8E9] p-10 w-[30%]  flex flex-col gap-6 flex flex-col gap-6"
          shadowColor="#962d70"
          onClick={() => router.push('/bank-payment')}
        >
          <div className="flex items-center justify-center">
            <CreditCard className="w-40 h-40" />
          </div>
          <div>Chuyển khoản ngân hàng</div>
        </PhysicalButton>
      </div>
      <CancelButton />
    </div>
  );
}
