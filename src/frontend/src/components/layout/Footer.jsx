import { Link } from 'react-router-dom'
import { Home, Github, Mail, MapPin, Phone } from 'lucide-react'
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
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-primary">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Home className="h-4 w-4" />
              </div>
              <span className="text-base tracking-tight">PhòngTrọ VL</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-6">
              Hệ thống hỗ trợ tìm kiếm và gợi ý phòng trọ sinh viên tại Vĩnh Long với công nghệ AI Hybrid.
            </p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Tỉnh Vĩnh Long, Việt Nam</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>support@phongtrovl.vn</span>
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
          <p>© {year} PhòngTrọ VL. Đồ án tốt nghiệp — Trường Đại học Cửu Long.</p>
          <div className="flex items-center gap-4">
            <span>Made with ❤️ in Vĩnh Long</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
