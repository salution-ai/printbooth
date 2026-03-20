"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Template, TemplateCategory } from "@/types/editor"

interface TemplateSelectorProps {
  templates: Template[]
  categories: TemplateCategory[]
  selectedTemplate: Template | null
  onSelect: (template: Template) => void
}

export function TemplateSelector({ templates, categories, selectedTemplate, onSelect }: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all")

  // Filter templates by category
  const filteredTemplates =
    activeCategory === "all" ? templates : templates.filter((template) => template.category.includes(activeCategory))

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">Chọn mẫu khung ảnh</h2>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("all")}
            className="rounded-full"
          >
            Tất cả
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className="rounded-full"
            >
              {category.name}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate?.id === template.id
                  ? "border-primary ring-2 ring-primary ring-opacity-50"
                  : "border-gray-200"
              }`}
              onClick={() => onSelect(template)}
            >
              <div className="aspect-square relative">
                <img
                  src={template.image || "/placeholder.svg"}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm">{template.name}</h3>
                <p className="text-xs text-gray-500">{template.slots} slots</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
