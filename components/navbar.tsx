"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"
import { getCartItems } from "@/services/cloudinary-service"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { sessionId, isLoading: isSessionLoading } = useSession()
  const [cartCount, setCartCount] = useState(0)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  // Load cart count
  useEffect(() => {
    const loadCartCount = async () => {
      if (!sessionId || isSessionLoading) return

      try {
        const items = await getCartItems(sessionId)
        setCartCount(items.length)
      } catch (error) {
        console.error("Error loading cart count:", error)
      }
    }

    if (sessionId && !isSessionLoading) {
      loadCartCount()
    }

    // Set up interval to refresh cart count every minute
    const interval = setInterval(() => {
      if (sessionId && !isSessionLoading) {
        loadCartCount()
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [sessionId, isSessionLoading])

  const navLinks = [
    { href: "/", label: "Trang chủ" },
    { href: "https://photolab.tulieconcept.vn/gioi-thieu/", label: "Photobooth Online", external: true },
    { href: "https://photolab.tulieconcept.vn/sale/", label: "Khuyến mãi", external: true },
    { href: "https://photolab.tulieconcept.vn/tin-tuc/", label: "Tin tức", external: true },
    { href: "/create", label: "Tạo ảnh" },
    { href: "/cart", label: "Giỏ hàng" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="PrintBooth Logo" width={36} height={28} className="object-contain" />
              <span className="text-2xl font-bold">PrintBooth</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === link.href ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            <div className="hidden md:block">
              <Button asChild className="rounded-full">
                <Link href="/create">Tạo ảnh</Link>
              </Button>
            </div>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 md:hidden shadow-lg">
          <div className="container mx-auto px-4 bg-white dark:bg-gray-900 shadow-md">
            <div className="flex h-16 items-center justify-between border-b">
              <Link href="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
                <Image src="/logo.PNG" alt="Tulie PhotoLab Logo" width={136} height={28} className="object-contain" />
              </Link>

              <Button variant="ghost" size="icon" onClick={toggleMenu}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <nav className="flex flex-col space-y-6 py-8">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium transition-colors hover:text-primary text-muted-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-primary",
                      pathname === link.href ? "text-primary" : "text-muted-foreground",
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}

              <Button asChild className="rounded-full w-full mt-4">
                <Link href="/create" onClick={() => setIsMenuOpen(false)}>
                  Tạo ảnh
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
