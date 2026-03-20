"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingBag, Tag, LogOut, Layers, BarChart } from "lucide-react"

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Đơn hàng",
      href: "/admin/orders",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    {
      title: "Danh mục",
      href: "/admin/categories",
      icon: <Tag className="h-5 w-5" />,
    },
    {
      title: "Mẫu khung",
      href: "/admin/templates",
      icon: <Layers className="h-5 w-5" />,
    },
    {
      title: "Mã giảm giá",
      href: "/admin/vouchers",
      icon: <BarChart className="h-5 w-5" />,
    },
  ]

  return (
    <div className="h-full flex flex-col border-r bg-white">
      <div className="p-6">
        <h2 className="text-2xl font-bold gradient-text">PhotoLab Admin</h2>
      </div>
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
                  isActive(item.href) && "bg-gray-100 text-gray-900 font-medium",
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto p-4 border-t">
        <Link
          href="/api/admin/auth/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5" />
          Đăng xuất
        </Link>
      </div>
    </div>
  )
}
