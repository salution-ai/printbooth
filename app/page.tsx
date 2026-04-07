"use client"
import { Playwrite_IE } from 'next/font/google'
import { motion } from "framer-motion"
import { useRouter } from "next/navigation";

const playwrightIE = Playwrite_IE({
  weight: ['400'],
})

export default function Home() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col gap-12 bg-[#FFF7F9] text-[#FF9EB4] items-center justify-center" onClick={() => router.push('/payment-methods')}>
      <h1 className={`text-9xl font-bold text-center animate-zoom ${playwrightIE.className}`}>{process.env.NEXT_PUBLIC_BRAND_NAME}</h1>
      <motion.p
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <p className="text-6xl text-center">Nhấn vào màn hình để bắt đầu</p>
      </motion.p>
    </div>
    // <div className="min-h-screen flex flex-col">
    //   <Navbar />

    //   {/* Hero Section */}
    //   <section className="relative overflow-hidden py-20 md:py-32">
    //     <div className="absolute inset-0 z-0 opacity-10">
    //       <div className="absolute inset-0 bg-gradient-to-r from-pink-200 to-blue-200" />
    //       <div className="absolute top-0 left-0 w-full h-full bg-[url('/placeholder.svg?height=500&width=500')] bg-repeat opacity-20" />
    //     </div>

    //     <div className="container mx-auto px-4 relative z-10">
    //       <div className="flex flex-col md:flex-row items-center">
    //         <div className="md:w-1/2 mb-10 md:mb-0">
    //           <h1 className="text-4xl md:text-6xl font-bold mb-6">
    //             <span className="gradient-text">Tạo ảnh ghép</span> đẹp mắt trong vài phút
    //           </h1>
    //           <p className="text-lg md:text-xl mb-8 text-gray-700">
    //             Upload ảnh của bạn, chọn khung ảnh yêu thích, và tùy chỉnh để tạo ra những tác phẩm độc đáo.
    //           </p>
    //           <div className="flex flex-col sm:flex-row gap-4">
    //             <Button asChild size="lg" className="rounded-full bg-primary hover:bg-primary/90">
    //               <Link href="/create">
    //                 Bắt đầu ngay <ArrowRight className="ml-2 h-5 w-5" />
    //               </Link>
    //             </Button>
    //             <Button asChild variant="outline" size="lg" className="rounded-full">
    //               <Link href="#how-it-works">Xem hướng dẫn</Link>
    //             </Button>
    //           </div>
    //         </div>
    //         <div className="md:w-1/2 relative">
    //           <div className="w-full animate-float">
    //             <Image
    //               src="/images/TuliePhotoLabPreview.jpg"
    //               alt="Tulie PhotoLab Preview"
    //               width={1200}
    //               height={800}
    //               className="w-full h-auto rounded-2xl shadow-xl"
    //               priority
    //             />
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </section>

    //   {/* Features Section */}
    //   <section className="py-16 bg-gray-50">
    //     <div className="container mx-auto px-4">
    //       <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">Tính năng nổi bật</h2>

    //       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    //         <div className="bg-white p-8 rounded-3xl shadow-md card-hover">
    //           <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center mb-6">
    //             <Layers className="h-8 w-8 text-primary" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">Nhiều mẫu khung ảnh</h3>
    //           <p className="text-gray-600">
    //             Lựa chọn từ bộ sưu tập khung ảnh đa dạng với nhiều kiểu dáng và số lượng ảnh khác nhau.
    //           </p>
    //         </div>

    //         <div className="bg-white p-8 rounded-3xl shadow-md card-hover">
    //           <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
    //             <Palette className="h-8 w-8 text-secondary" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">Tùy chỉnh linh hoạt</h3>
    //           <p className="text-gray-600">
    //             Zoom, xoay, và điều chỉnh vị trí ảnh một cách dễ dàng để có được kết quả hoàn hảo.
    //           </p>
    //         </div>

    //         <div className="bg-white p-8 rounded-3xl shadow-md card-hover">
    //           <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-6">
    //             <Download className="h-8 w-8 text-purple-600" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">Tải về chất lượng cao</h3>
    //           <p className="text-gray-600">Nhận ảnh chất lượng cao không có watermark sau khi thanh toán.</p>
    //         </div>
    //       </div>
    //     </div>
    //   </section>

    //   {/* How It Works Section */}
    //   <section id="how-it-works" className="py-16">
    //     <div className="container mx-auto px-4">
    //       <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">Quy trình sử dụng</h2>

    //       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
    //         <div className="text-center">
    //           <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-6">
    //             <Camera className="h-8 w-8 text-primary" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">1. Upload ảnh</h3>
    //           <p className="text-gray-600">Tải lên ảnh từ thiết bị của bạn</p>
    //         </div>

    //         <div className="text-center">
    //           <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
    //             <ImageIcon className="h-8 w-8 text-secondary" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">2. Chọn khung</h3>
    //           <p className="text-gray-600">Lựa chọn mẫu khung ảnh phù hợp</p>
    //         </div>

    //         <div className="text-center">
    //           <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
    //             <Palette className="h-8 w-8 text-purple-600" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">3. Tùy chỉnh</h3>
    //           <p className="text-gray-600">Điều chỉnh vị trí và kích thước ảnh</p>
    //         </div>

    //         <div className="text-center">
    //           <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
    //             <Download className="h-8 w-8 text-green-600" />
    //           </div>
    //           <h3 className="text-xl font-bold mb-3">4. Tải về</h3>
    //           <p className="text-gray-600">Thanh toán và tải ảnh chất lượng cao</p>
    //         </div>
    //       </div>

    //       <div className="mt-12 text-center">
    //         <Button asChild size="lg" className="rounded-full bg-primary hover:bg-primary/90">
    //           <Link href="/create">
    //             Bắt đầu ngay <ArrowRight className="ml-2 h-5 w-5" />
    //           </Link>
    //         </Button>
    //       </div>
    //     </div>
    //   </section>

    //   {/* Testimonials */}
    //   <section className="py-16 bg-gray-50">
    //     <div className="container mx-auto px-4">
    //       <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">
    //         Khách hàng nói gì về chúng tôi
    //       </h2>

    //       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    //         <div className="bg-white p-8 rounded-3xl shadow-md">
    //           <div className="flex items-center mb-4">
    //             <Image
    //               src="/testimotional-avatar-1.png"
    //               alt="Avatar của Nguyễn Thị Hương"
    //               width={48}
    //               height={48}
    //               className="rounded-full mr-4 object-cover h-[48px]"
    //             />
    //             <div>
    //               <h4 className="font-bold">Nguyễn Thị Hương</h4>
    //               <p className="text-gray-500 text-sm">Hà Nội</p>
    //             </div>
    //           </div>
    //           <p className="text-gray-600">
    //             "Tôi rất thích PhotoLab! Dễ sử dụng và cho phép tôi tạo ra những bức ảnh ghép đẹp mắt để chia sẻ với bạn
    //             bè."
    //           </p>
    //         </div>

    //         <div className="bg-white p-8 rounded-3xl shadow-md">
    //           <div className="flex items-center mb-4">
    //             <Image
    //               src="/testimotional-avatar-2.png"
    //               alt="Avatar của Trần Minh Hùng"
    //               width={48}
    //               height={48}
    //               className="rounded-full mr-4 object-cover h-[48px]"
    //             />
    //             <div>
    //               <h4 className="font-bold">Trần Minh Hùng</h4>
    //               <p className="text-gray-500 text-sm">TP. Hồ Chí Minh</p>
    //             </div>
    //           </div>
    //           <p className="text-gray-600">
    //             "Công cụ tuyệt vời để tạo ảnh kỷ niệm. Tôi đã làm album ảnh cho chuyến du lịch của mình và kết quả thật
    //             tuyệt vời!"
    //           </p>
    //         </div>

    //         <div className="bg-white p-8 rounded-3xl shadow-md">
    //           <div className="flex items-center mb-4">
    //             <Image
    //               src="/testimotional-avatar-3.png"
    //               alt="Avatar của Lê Thanh Thảo"
    //               width={48}
    //               height={48}
    //               className="rounded-full mr-4 object-cover h-[48px]"
    //             />
    //             <div>
    //               <h4 className="font-bold">Lê Thanh Thảo</h4>
    //               <p className="text-gray-500 text-sm">Đà Nẵng</p>
    //             </div>
    //           </div>
    //           <p className="text-gray-600">
    //             "Tính năng tùy chỉnh ảnh rất dễ sử dụng. Tôi có thể tạo ra những bức ảnh ghép đẹp mắt chỉ trong vài
    //             phút."
    //           </p>
    //         </div>
    //       </div>
    //     </div>
    //   </section>

    //   {/* CTA Section */}
    //   <section className="py-20 gradient-bg text-white">
    //     <div className="container mx-auto px-4 text-center">
    //       <h2 className="text-3xl md:text-4xl font-bold mb-6">Sẵn sàng tạo ảnh ghép đẹp mắt?</h2>
    //       <p className="text-xl mb-8 max-w-2xl mx-auto">
    //         Bắt đầu ngay hôm nay và tạo ra những kỷ niệm đáng nhớ với PhotoLab
    //       </p>
    //       <Button asChild size="lg" variant="secondary" className="rounded-full">
    //         <Link href="/create">
    //           Bắt đầu ngay <ArrowRight className="ml-2 h-5 w-5" />
    //         </Link>
    //       </Button>
    //     </div>
    //   </section>

    //   <Footer />
    // </div>
  )
}
