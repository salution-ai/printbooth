"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, label, id, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(checked || false)

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked)
      }
    }, [checked])

    const handleClick = () => {
      const newChecked = !isChecked
      setIsChecked(newChecked)
      onCheckedChange?.(newChecked)
    }

    return (
      <div className="flex items-center space-x-2">
        <div className="relative cursor-pointer" onClick={handleClick}>
          <div
            className={cn(
              "h-4 w-4 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              isChecked ? "bg-primary" : "bg-background",
              className,
            )}
          >
            {isChecked && <Check className="h-4 w-4 text-primary-foreground" />}
          </div>
          <input
            type="checkbox"
            ref={ref}
            checked={isChecked}
            onChange={() => {}} // Để tránh warning về controlled component
            className="sr-only"
            id={id}
            {...props}
          />
        </div>
        {label && <span className="text-sm">{label}</span>}
      </div>
    )
  },
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
