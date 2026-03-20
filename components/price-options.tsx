"use client"
import { Card, CardContent } from "@/components/ui/card"
import { PriceDisplay } from "@/components/price-display"
import { Download, Printer } from "lucide-react"
import type { PriceOption } from "@/types/editor"

interface PriceOptionsProps {
  options: PriceOption[]
  selectedOption: string
  onOptionChange: (option: string) => void
}

export function PriceOptions({ options, selectedOption, onOptionChange }: PriceOptionsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Chọn loại sản phẩm</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option) => (
          <Card
            key={option.type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedOption === option.type ? "border-primary ring-primary ring-opacity-50" : "border-gray-200"
            }`}
            onClick={() => onOptionChange(option.type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {option.type === "download" ? (
                    <Download className="h-5 w-5 text-primary" />
                  ) : (
                    <Printer className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-xs text-gray-500">
                      {option.type === "download" ? "Nhận file ảnh chất lượng cao" : "Nhận ảnh in chất lượng cao"}
                    </p>
                  </div>
                </div>
                <PriceDisplay originalPrice={option.original_price} salePrice={option.sale_price} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
