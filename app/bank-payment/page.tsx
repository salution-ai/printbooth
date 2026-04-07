"use client";
import { generateVietQRCode } from "@/services/payment-service";
import { useEffect, useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/utils/utils";
import PhysicalButton from "@/components/buttons/physical-button";
import { RefreshCw } from "lucide-react";
import BackButton from "@/components/buttons/back-button";
import CancelButton from "@/components/buttons/cancel-button";
import { useRouter } from "next/navigation";

export default function BankPaymentPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const router = useRouter();
  // Thông tin tài khoản ngân hàng
  const bankInfo = {
    bankName: "TPBank - Ngân hàng thương mại cổ phần Tiên Phong",
    accountNumber: "11114062001",
    accountName: "Lê Đức Huy",
    branch: "Bắc Ninh",
  };

  useEffect(() => {
    setQrCodeUrl(
      generateVietQRCode({
        orderCode: "KS1234567890",
        amount: 50000,
        description: "Thanh toán đơn hàng",
      }),
    );
  }, []);
  return (
    <div className="min-h-screen flex flex-col gap-10 bg-[#FFF7F9] text-[#B84F6F] items-center justify-center font-bold">
      <div className="flex flex-col gap-2 items-center">
        <h1 className="text-5xl">Thanh toán đơn hàng</h1>
        <p className="text-gray-600">
          Vui lòng quét mã QR bên dưới để thanh toán đơn hàng của bạn
        </p>
      </div>
      {qrCodeUrl ? (
        <div className="relative w-64 h-64 mb-4 border-2 border-[#B84F6F]">
          <Image
            src={qrCodeUrl || "/placeholder.svg"}
            alt="QR Code thanh toán"
            fill
            className="object-contain"
            unoptimized={true}
          />
        </div>
      ) : (
        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center mb-4">
          <p className="text-gray-500">Đang tạo mã QR...</p>
        </div>
      )}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Thông tin tài khoản</h2>
          <div className="w-12 h-12 relative">
            <Image
              src="/tpbank-logo-display.png"
              alt="TPBank"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Ngân hàng</p>
            <div className="flex justify-between items-center mt-1">
              <p className="font-medium">{bankInfo.bankName}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Số tài khoản</p>
            <div className="flex justify-between items-center mt-1">
              <p className="font-medium">{bankInfo.accountNumber}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Chủ tài khoản</p>
            <div className="flex justify-between items-center mt-1">
              <p className="font-medium">{bankInfo.accountName}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Số tiền</p>
            <p className="font-medium">{formatPrice(50000)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nội dung</p>
            <p className="font-medium">KS1234567890</p>
          </div>

          <PhysicalButton
            className="w-full flex items-center justify-center"
            shadowColor="#962d70"
            onClick={() => {
              router.push('/start');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Kiểm tra thủ công
          </PhysicalButton>
        </div>
        <BackButton />
        <CancelButton duration={240} />
      </div>
    </div>
  );
}
