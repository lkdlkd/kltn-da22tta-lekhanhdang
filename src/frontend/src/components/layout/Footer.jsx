import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { BedDouble, Globe, GraduationCap, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  const { pathname } = useLocation()
  const user = useSelector((state) => state.auth?.user)
  const year = new Date().getFullYear()

  // Ẩn footer ở các trang console Admin & Landlord
  const isConsole =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/landlord/dashboard') ||
    pathname.startsWith('/landlord/rooms') ||
    pathname.startsWith('/landlord/appointments')

  if (isConsole) return null

  const isLandlord = user?.role === 'landlord'
  const isStudent = user?.role === 'student'
  const isLoggedIn = !!user

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand & Info */}
          <div className="space-y-5">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-primary">
                <BedDouble className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-base font-extrabold tracking-tight">
                  Phòng Trọ <span className="text-primary">Sinh Viên</span>
                </span>
                <span className="text-xs text-muted-foreground">Tìm phòng · Gợi ý · Vĩnh Long</span>
              </span>
            </Link>

            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Nền tảng hỗ trợ sinh viên tìm phòng trọ quanh Vĩnh Long, so sánh thông tin rõ ràng và kết nối nhanh với chủ trọ.
            </p>
            {/* 
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Đồ án tốt nghiệp</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Đại học Trà Vinh · CNTT</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Thông tin minh bạch</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Giá, diện tích, trạng thái và địa chỉ dễ kiểm tra.</p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Navigation Links */}
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Khám phá — luôn hiển thị */}
            <div>
              <h3 className="text-sm font-semibold">Khám phá</h3>
              <ul className="mt-3 space-y-2">
                <li><Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Trang chủ</Link></li>
                <li><Link to="/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Tìm phòng</Link></li>
                {isLoggedIn && (
                  <li><Link to="/recommend" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Gợi ý cho bạn</Link></li>
                )}
                <li><Link to="/compare" className="text-sm text-muted-foreground transition-colors hover:text-foreground">So sánh phòng</Link></li>
              </ul>
            </div>

            {/* Tài khoản — phụ thuộc vào trạng thái đăng nhập */}
            <div>
              <h3 className="text-sm font-semibold">Tài khoản</h3>
              <ul className="mt-3 space-y-2">
                {!isLoggedIn ? (
                  <>
                    <li><Link to="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Đăng nhập</Link></li>
                    <li><Link to="/register" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Đăng ký</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Hồ sơ cá nhân</Link></li>
                    {(isStudent || isLandlord) && (
                      <li><Link to="/appointments" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Lịch hẹn của tôi</Link></li>
                    )}
                    {isStudent && (
                      <li><Link to="/favorites" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Phòng yêu thích</Link></li>
                    )}
                  </>
                )}
              </ul>
            </div>

            {/* Cột thứ 3: Chủ trọ (nếu là landlord) hoặc Liên hệ (cho khách/sinh viên) */}
            {isLandlord ? (
              <div>
                <h3 className="text-sm font-semibold">Quản lý phòng</h3>
                <ul className="mt-3 space-y-2">
                  <li><Link to="/landlord/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Bảng điều khiển</Link></li>
                  <li><Link to="/landlord/rooms/create" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Đăng tin phòng</Link></li>
                  <li><Link to="/landlord/rooms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Phòng của tôi</Link></li>
                </ul>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold">Về chúng tôi</h3>
                <ul className="mt-3 space-y-2">
                  <li><Link to="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Giới thiệu</Link></li>
                  <li><Link to="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Liên hệ</Link></li>
                  {!isLoggedIn && (
                    <li>
                      <Link to="/register" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        Đăng ký chủ trọ
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© {year} Phòng Trọ Sinh Viên.</span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
            <span>Thiết kế cho nhu cầu tìm phòng sinh viên.</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Vĩnh Long, Việt Nam
            </span>
            <a href={`mailto:support@${window.location.hostname || 'sinhvientvu.com'}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
              <Mail className="h-3.5 w-3.5" />
              Liên hệ
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
