import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Home, Users, MessageSquare, Shield, Flag } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/rooms', label: 'Phòng trọ', icon: Home },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/comments', label: 'Bình luận', icon: MessageSquare },
  { to: '/admin/reports', label: 'Báo cáo', icon: Flag },
]

export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100svh-var(--navbar-h))] bg-muted/20">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r bg-card">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">Admin Panel</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Quản trị hệ thống</p>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-0.5 pt-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <Separator />
        <div className="p-4">
          <p className="text-[10px] text-muted-foreground text-center">Phòng Trọ Sinh Viên</p>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile nav */}
        <div className="lg:hidden border-b bg-card">
          <nav className="flex gap-0 overflow-x-auto scrollbar-none px-2 py-1.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
