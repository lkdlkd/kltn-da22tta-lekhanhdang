import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, Flag, Home, LayoutDashboard, MessageSquare, Shield, Users, Bell } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/rooms', label: 'Phòng trọ', icon: Home },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/appointments', label: 'Lịch hẹn', icon: Calendar },
  { to: '/admin/comments', label: 'Bình luận', icon: MessageSquare },
  { to: '/admin/reports', label: 'Báo cáo', icon: Flag },
  { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
]

function SidebarLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] bg-muted/25">
      {/* Desktop Sidebar (Fixed on the left side) */}
      <aside className="fixed left-0 top-16 bottom-0 hidden w-64 shrink-0 flex-col border-r bg-background lg:flex z-30">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight">Admin Console</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Quản trị Phòng Trọ Sinh Viên</p>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => <SidebarLink key={item.to} {...item} />)}
        </nav>

        <Separator />

        <div className="p-4">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs font-semibold">Khu vực quản trị</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Kiểm duyệt phòng, người dùng, bình luận và báo cáo vi phạm.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Mobile Sub-Navigation Header Bar (Sticky) */}
        <div className="sticky top-16 z-40 border-b bg-background/90 shadow-sm backdrop-blur-md lg:hidden">
          <nav className="flex gap-1.5 overflow-x-auto p-2 scrollbar-none justify-start items-center">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all duration-300',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]'
                      : 'text-muted-foreground hover:bg-muted/65 hover:text-foreground'
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
