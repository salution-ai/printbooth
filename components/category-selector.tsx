"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { TemplateCategory } from "@/types/editor"
import { cn } from "@/lib/utils"

interface CategorySelectorProps {
  categories: TemplateCategory[]
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

export function CategorySelector({ categories, selectedCategory, onSelectCategory }: CategorySelectorProps) {
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const toggleExpanded = () => {
    setExpanded(!expanded)
  }

  // Sửa lại hàm handleCategoryClick để xử lý đúng khi người dùng chọn "Tất cả"
  const handleCategoryClick = (categoryId: string | null) => {
    onSelectCategory(categoryId)
    if (expanded) {
      setExpanded(false)
    }
  }

  const visibleCategories = expanded ? categories : categories.slice(0, isMobile ? 3 : 6)
  const hasMoreCategories = categories.length > visibleCategories.length

  return (
    <div className="w-full mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Danh mục</h3>
        <Button variant="ghost" size="sm" onClick={toggleExpanded} className="flex items-center gap-1">
          {expanded ? (
            <>
              Thu gọn <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {hasMoreCategories && (
                <>
                  Xem thêm <ChevronDown className="h-4 w-4" />
                </>
              )}
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        {expanded ? (
          // Sửa lại phần hiển thị nút "Thu gọn" trong ScrollArea
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleCategoryClick(null)}
              >
                Tất cả
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(null)}
            >
              Tất cả
            </Button>
            {visibleCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
