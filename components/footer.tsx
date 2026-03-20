import Link from "next/link"
import { Facebook, Instagram, Mail, Phone } from "lucide-react"
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="bg-gray-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            {/* <h3 className="text-xl font-bold mb-4 gradient-text">Tulie PhotoLab</h3> */}
            <Image
              src="/logo.PNG"
              alt="Tulie PhotoLab Logo"
              width={186}
              height={28}
              className="object-contain mb-4"
            />
            <p className="text-gray-600 mb-4">
              Tạo ảnh ghép đẹp mắt trong vài phút với công cụ chỉnh sửa ảnh trực tuyến của chúng tôi.
            </p>
            <div className="flex space-x-4">
              <Link href="https://www.facebook.com/tuliephotolab.online" target="_blank" className="text-gray-500 hover:text-primary">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" target="_blank" className="text-gray-500 hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="mailto:tuliephotolab@gmail.com" className="text-gray-500 hover:text-primary">
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-600 hover:text-primary">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-gray-600 hover:text-primary">
                  Tạo ảnh
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-gray-600 hover:text-primary">
                  Giỏ hàng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-primary">
                  Hướng dẫn sử dụng
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-primary">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-primary">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-primary">
                  Điều khoản sử dụng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Liên hệ</h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-primary" />
                <span className="text-gray-600">098 898 4554</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-primary" />
                <span className="text-gray-600">tuliephotolab@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} PhotoLab. Tất cả các quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  )
}
