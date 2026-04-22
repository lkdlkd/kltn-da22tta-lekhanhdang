import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { logout, selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSlice'
import { logoutApi } from '@/services/authService'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Home, MessageCircle, User, LogOut, Shield, Building2, LayoutDashboard,
  Moon, Sun, Heart, Calendar, Search, Menu, X, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ', exact: true },
  { to: '/search', label: 'Tìm phòng' },
  { to: '/recommend', label: 'Gợi ý AI' },
]

const LANDLORD_MENU = [
  { to: '/landlord/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/landlord/rooms',     icon: Building2,       label: 'Quản lý phòng' },
  { to: '/landlord/appointments', icon: Calendar,     label: 'Lịch hẹn' },
  { to: '/messages',           icon: MessageCircle,   label: 'Tin nhắn' },
]

const ROLE_LABEL = {
  student:  { text: 'Sinh viên', cls: 'text-blue-600 dark:text-blue-400' },
  landlord: { text: 'Chủ trọ',   cls: 'text-emerald-600 dark:text-emerald-400' },
  admin:    { text: 'Admin',     cls: 'text-orange-600 dark:text-orange-400' },
}

// ── Landlord dropdown (desktop) ────────────────────────────────────────────────
function LandlordDropdown({ isActive }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const isLandlordRoute = location.pathname.startsWith('/landlord')

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
          isLandlordRoute
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        Quản lý
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl border bg-background shadow-lg z-50 p-1">
          {LANDLORD_MENU.map(({ to, icon: Icon, label }) => (
            <Link
              key={to} to={to}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isAuth = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const menuRef = useRef(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [location.pathname])

  // Real-time unread count
  useEffect(() => {
    if (!isAuth) return
    const socket = getSocket()
    const onUnread = ({ count }) => setUnreadMsgs(count)
    socket.on('unread_count', onUnread)
    return () => socket.off('unread_count', onUnread)
  }, [isAuth])

  // Close mobile menu on outside click
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    try { await logoutApi() } catch { }
    dispatch(logout())
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  const isActive = (to, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md" ref={menuRef}>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Home className="h-3.5 w-3.5" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-foreground">
              PhòngTrọ <span className="text-primary">VL</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">ĐH Trà Vinh</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <Link
              key={to} to={to}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                isActive(to, exact)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {label}
            </Link>
          ))}

          {/* Landlord dropdown */}
          {isAuth && user?.role === 'landlord' && (
            <LandlordDropdown />
          )}
          {/* Admin shortcut inline */}
          {isAuth && user?.role === 'admin' && (
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive('/admin')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        {mounted && (
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 rounded-full shrink-0"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Đổi theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        {isAuth ? (
          <>
            {/* Messages */}
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full shrink-0" asChild>
              <Link to="/messages" title="Tin nhắn">
                <MessageCircle className="h-4 w-4" />
                {unreadMsgs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </Link>
            </Button>

            {/* Notifications */}
            <NotificationDropdown />

            {/* Favorites — md+ */}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden md:flex shrink-0" asChild>
              <Link to="/favorites" title="Yêu thích"><Heart className="h-4 w-4" /></Link>
            </Button>

            {/* User pill — md+ */}
            <Button
              variant="ghost" size="sm"
              className="hidden md:flex h-8 items-center gap-1.5 rounded-full pl-1.5 pr-3 border shrink-0"
              asChild
            >
              <Link to="/profile">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">
                  {(user?.name || 'U')[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium max-w-[80px] truncate hidden lg:block">
                  {user?.name?.split(' ').pop() || 'Tôi'}
                </span>
              </Link>
            </Button>

            {/* Logout — md+ */}
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 rounded-full hidden md:flex shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild className="h-8 rounded-full text-sm shrink-0 hidden md:flex">
              <Link to="/login">Đăng nhập</Link>
            </Button>
            <Button size="sm" asChild className="h-8 rounded-full text-sm shadow-sm shrink-0 hidden md:flex">
              <Link to="/register">Đăng ký</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0 md:hidden" asChild>
              <Link to="/login" title="Đăng nhập"><User className="h-4 w-4" /></Link>
            </Button>
          </>
        )}

        {/* Hamburger */}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-full md:hidden shrink-0 ml-0.5"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t bg-background shadow-sm">
          <div className="px-4 py-3 space-y-1">

            {/* Nav links */}
            {NAV_LINKS.map(({ to, label, exact }) => (
              <Link
                key={to} to={to}
                className={cn(
                  'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(to, exact)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                {label}
              </Link>
            ))}

            <Separator className="my-2" />

            {isAuth ? (
              <>
                {/* User info */}
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold shrink-0">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{user?.name || 'Tài khoản'}</p>
                    <p className={cn('text-xs font-medium', ROLE_LABEL[user?.role]?.cls)}>
                      {ROLE_LABEL[user?.role]?.text || user?.role}
                    </p>
                  </div>
                </Link>

                {/* Quick links grid */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { to: '/favorites',    icon: Heart,           label: 'Yêu thích' },
                    { to: '/appointments', icon: Calendar,        label: 'Lịch hẹn' },
                    { to: '/search',       icon: Search,          label: 'Tìm phòng' },
                    ...(user?.role === 'landlord' ? [
                      { to: '/landlord/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
                      { to: '/landlord/rooms',         icon: Building2,       label: 'Phòng trọ' },
                      { to: '/landlord/appointments',  icon: Calendar,        label: 'QL Lịch hẹn' },
                    ] : []),
                    ...(user?.role === 'admin' ? [
                      { to: '/admin', icon: Shield, label: 'Admin' },
                    ] : []),
                  ].map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to} to={to}
                      className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 py-3 text-xs font-medium hover:bg-muted hover:border-primary/30 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-center leading-tight">{label}</span>
                    </Link>
                  ))}
                </div>

                <Separator className="my-2" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />Đăng xuất
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" asChild className="rounded-xl">
                  <Link to="/login">Đăng nhập</Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link to="/register">Đăng ký</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
