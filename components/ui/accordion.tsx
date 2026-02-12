"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionContextType {
  openItems: string[]
  toggleItem: (value: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextType | null>(null)

interface AccordionProps {
  children: React.ReactNode
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  className?: string
}

export function Accordion({
  children,
  type = "single",
  defaultValue,
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<string[]>(() => {
    if (!defaultValue) return []
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
  })

  const toggleItem = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        if (type === "single") {
          return prev.includes(value) ? [] : [value]
        }
        return prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      })
    },
    [type]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function AccordionItem({ children, value, className }: AccordionItemProps) {
  return (
    <div
      className={cn("border border-border rounded-lg overflow-hidden", className)}
      data-value={value}
    >
      {children}
    </div>
  )
}

interface AccordionTriggerProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function AccordionTrigger({ children, value, className }: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error("AccordionTrigger must be used within Accordion")

  const isOpen = context.openItems.includes(value)

  return (
    <button
      type="button"
      onClick={() => context.toggleItem(value)}
      className={cn(
        "flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-all hover:bg-muted/50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  )
}

interface AccordionContentProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function AccordionContent({ children, value, className }: AccordionContentProps) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error("AccordionContent must be used within Accordion")

  const isOpen = context.openItems.includes(value)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "overflow-hidden border-t border-border",
        className
      )}
    >
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}
