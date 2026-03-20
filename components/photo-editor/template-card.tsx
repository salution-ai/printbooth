"use client"

import { PriceDisplay } from "@/components/price-display"
import type { Template } from "@/types/editor"

interface TemplateCardProps {
  template: Template
  isSelected: boolean
  onClick: () => void
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-primary ring-2 ring-primary ring-opacity-50" : "border-gray-200"
      }`}
      onClick={onClick}
    >
      <div className="aspect-square relative">
        <img src={template.image || "/placeholder.svg"} alt={template.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm">{template.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-500">{template.slots} slots</p>
          <div className="text-right">
            <PriceDisplay originalPrice={template.download_price} salePrice={template.download_sale_price} />
          </div>
        </div>
      </div>
    </div>
  )
}
