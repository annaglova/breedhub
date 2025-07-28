"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@ui/lib/utils"

interface CustomDropdownProps {
  value: string | number
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
  className?: string
}

export function CustomDropdown({ value, options, onChange, className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(opt => opt.value === value)
  
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue)
    setIsOpen(false)
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between",
          "bg-white border border-gray-300 rounded-md",
          "px-3 py-2 text-base font-medium text-gray-700",
          "cursor-pointer transition-all",
          "hover:border-primary-500 focus:border-primary-500",
          "focus:outline-none focus:ring-2 focus:ring-primary-500/20",
          className
        )}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full px-3 py-2 text-left text-base",
                "hover:bg-gray-100 transition-colors",
                value === option.value && "bg-primary-50 text-primary-700 font-medium"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}