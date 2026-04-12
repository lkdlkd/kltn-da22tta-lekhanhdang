import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Home, Users, Star, Shield, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/rooms', label: 'Phòng trọ', icon: Home },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/reviews', label: 'Đánh giá', icon: Star },
  { to: '/admin/reports', label: 'Báo cáo', icon: Flag },
]

function SidebarLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}

export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-background p-4 space-y-1">
        <div className="mb-4 flex items-center gap-2 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold">Admin</span>
        </div>
        {NAV_ITEMS.map((item) => <SidebarLink key={item.to} {...item} />)}
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
