"use client"

import { cn } from "@/lib/utils";

export default function PhysicalButton({ className, shadowColor = "#2e7d32", children, onClick }: { className: string, shadowColor?: string, children: React.ReactNode, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn(`px-5 py-3 bg-primary rounded-lg shadow-[0_5px_0_${shadowColor}] transition-all duration-100 hover:-translate-y-1 hover:shadow-[0_7px_0_${shadowColor}] active:translate-y-1 active:shadow-[0_2px_0_${shadowColor}]`, className)}>
      {children}
    </button>
  );
}