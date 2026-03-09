"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipTrigger must be used within a Tooltip");
  }
  
  const handleMouseEnter = () => context.setOpen(true);
  const handleMouseLeave = () => context.setOpen(false);
  const handleFocus = () => context.setOpen(true);
  const handleBlur = () => context.setOpen(false);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    });
  }
  
  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </span>
  );
}

export function TooltipContent({
  children,
  className,
  sideOffset = 4,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}) {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipContent must be used within a Tooltip");
  }
  
  if (!context.open) {
    return null;
  }
  
  return (
    <div
      role="tooltip"
      className={cn(
        "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2",
        "overflow-hidden rounded-md border bg-popover px-3 py-1.5",
        "text-sm text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{ marginBottom: sideOffset }}
      {...props}
    >
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b" />
    </div>
  );
}
