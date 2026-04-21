import { Link } from 'react-router-dom'
import { Home, Mail, MapPin, Phone, Globe, GraduationCap } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const FOOTER_LINKS = {
  'Khám phá': [
    { label: 'Trang chủ', to: '/' },
    { label: 'Tìm phòng', to: '/search' },
    { label: 'Gợi ý AI', to: '/recommend' },
    { label: 'So sánh phòng', to: '/compare' },
  ],
  'Tài khoản': [
    { label: 'Đăng nhập', to: '/login' },
    { label: 'Đăng ký', to: '/register' },
    { label: 'Hồ sơ cá nhân', to: '/profile' },
    { label: 'Phòng yêu thích', to: '/favorites' },
  ],
  'Chủ trọ': [
    { label: 'Đăng tin phòng', to: '/landlord/rooms/create' },
    { label: 'Quản lý phòng', to: '/landlord/rooms' },
    { label: 'Lịch hẹn', to: '/landlord/appointments' },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12">

        {/* Top row */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">

          {/* Brand — 2 cols wide */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-primary">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Home className="h-4 w-4" />
              </div>
              <span className="text-base tracking-tight">PhòngTrọ <span className="text-muted-foreground font-normal">VL</span></span>
            </Link>
            <p className="text-sm text-muted-foreground leading-6">
              Hệ thống hỗ trợ tìm kiếm và gợi ý phòng trọ sinh viên tại Vĩnh Long với công nghệ AI Hybrid.
            </p>

            {/* TVU credit */}
            <div className="flex items-start gap-2.5 rounded-lg border bg-background p-3">
              <GraduationCap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-snug">Đồ án tốt nghiệp</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Trường Đại học Trà Vinh</p>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{group}</h3>
              <ul className="space-y-2">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
            <p>© {year} PhòngTrọ VL.</p>
            <span className="hidden sm:block text-muted-foreground/40">·</span>
            <p>
              Đồ án tốt nghiệp — 
              <a href="https://www.tvu.edu.vn" target="_blank" rel="noreferrer"
                className="ml-1 font-medium text-foreground hover:text-primary transition-colors">
                Trường Đại học Trà Vinh
              </a>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span>Vĩnh Long, Việt Nam</span>
            <a
              href="https://www.tvu.edu.vn"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              title="Website ĐH Trà Vinh"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>tvu.edu.vn</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
