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
  BedDouble, MessageCircle, User, LogOut, Shield, Building2,
  LayoutDashboard, Moon, Sun, Heart, Calendar, Search,
  Menu, X, ChevronDown, Sparkles, Bell, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { cn } from '@/lib/utils'

// ── Navigation config ─────────────────────────────────────────────────────────
const NAV_LINKS = [
  { to: '/',          label: 'Trang chủ',        exact: true },
  { to: '/search',    label: 'Tìm phòng',       icon: Search },
  { to: '/recommend', label: 'Gợi ý cho bạn',  icon: Sparkles, highlight: true },
]

const LANDLORD_MENU = [
  { to: '/landlord/dashboard',    icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/landlord/rooms',        icon: Building2,       label: 'Quản lý phòng' },
  { to: '/landlord/appointments', icon: Calendar,        label: 'Lịch hẹn' },
]

const ROLE_LABEL = {
  student:  { text: 'Sinh viên', cls: 'text-blue-600 dark:text-blue-400' },
  landlord: { text: 'Chủ trọ',   cls: 'text-emerald-600 dark:text-emerald-400' },
  admin:    { text: 'Quản trị viên', cls: 'text-orange-600 dark:text-orange-400' },
}

// ── Landlord "Quản lý" dropdown ───────────────────────────────────────────────
function LandlordDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const isActive = location.pathname.startsWith('/landlord')

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Building2 className="h-3.5 w-3.5" />
        Quản lý
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg z-50 p-1.5">
          {LANDLORD_MENU.map(({ to, icon: Icon, label }) => (
            <Link
              key={to} to={to}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                location.pathname.startsWith(to)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {label}
            </Link>
          ))}
          <Separator className="my-1.5" />
          <Link
            to="/landlord/rooms/create"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded text-xs font-bold shrink-0">+</span>
            Đăng phòng mới
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isAuth = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const navRef = useRef(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => setMobileOpen(false), [location.pathname])

  useEffect(() => {
    if (!isAuth) return
    const socket = getSocket()
    const onUnread = ({ count }) => setUnreadMsgs(count)
    socket.on('unread_count', onUnread)
    return () => socket.off('unread_count', onUnread)
  }, [isAuth])

  useEffect(() => {
    if (!mobileOpen) return
    const h = (e) => { if (!navRef.current?.contains(e.target)) setMobileOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [mobileOpen])

  const handleLogout = async () => {
    setMobileOpen(false)
    try { await logoutApi() } catch { }
    dispatch(logout())
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  const isActive = (to, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5 mr-1">
          {/* Icon */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <BedDouble className="h-4 w-4" />
          </div>
          {/* Text */}
          <div className="hidden sm:block leading-none">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold tracking-tight text-foreground">Phòng Trọ</span>
              <span className="text-sm font-extrabold text-primary">TVU</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
              Tìm phòng · Gợi ý AI · Vinh Long
            </p>
          </div>
        </Link>

        {/* ── Desktop nav ────────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ to, label, exact, highlight }) => (
            <Link
              key={to} to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                isActive(to, exact)
                  ? 'bg-primary/10 text-primary'
                  : highlight
                    ? 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {label}
              {highlight && <Sparkles className="h-3 w-3" />}
            </Link>
          ))}

          {/* Landlord dropdown */}
          {isAuth && user?.role === 'landlord' && <LandlordDropdown />}

          {/* Admin link */}
          {isAuth && user?.role === 'admin' && (
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive('/admin')
                  ? 'bg-primary/10 text-primary'
                  : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </nav>

        {/* ── Spacer ─────────────────────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Right actions ──────────────────────────────────────────────── */}

        {/* "Đăng phòng" CTA — chủ trọ chưa có chú ý đặc biệt trên desktop */}
        {isAuth && user?.role === 'landlord' && (
          <Button size="sm" variant="outline" asChild
            className="hidden lg:flex h-8 gap-1.5 rounded-full text-xs border-primary/40 text-primary hover:bg-primary/10">
            <Link to="/landlord/rooms/create">
              <span className="font-bold text-sm leading-none">+</span> Đăng phòng
            </Link>
          </Button>
        )}

        {/* Theme toggle */}
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
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </Link>
            </Button>

            {/* Notifications */}
            <NotificationDropdown />

            {/* Favorites — md+ */}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden md:flex shrink-0" asChild>
              <Link to="/favorites" title="Phòng yêu thích"><Heart className="h-4 w-4" /></Link>
            </Button>

            {/* User avatar pill — md+ */}
            <Button
              variant="ghost" size="sm"
              className="hidden md:flex h-8 items-center gap-2 rounded-full pl-1 pr-3 border shrink-0 hover:border-primary/40"
              asChild
            >
              <Link to="/profile">
                {user?.avatar
                  ? <img src={user.avatar} className="h-6 w-6 rounded-full object-cover shrink-0" alt="" />
                  : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0">
                      {(user?.name || 'U')[0].toUpperCase()}
                    </div>
                }
                <span className="text-xs font-medium max-w-[72px] truncate">
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
              <Link to="/register">Đăng ký miễn phí</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0 md:hidden" asChild>
              <Link to="/login" title="Đăng nhập"><User className="h-4 w-4" /></Link>
            </Button>
          </>
        )}

        {/* Hamburger */}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-full md:hidden shrink-0"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/98 shadow-lg">
          <div className="px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">

            {/* Site tagline */}
            <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-xl bg-primary/5 border border-primary/10">
              <BedDouble className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-primary">Phòng Trọ TVU</p>
                <p className="text-[10px] text-muted-foreground">Gợi ý phòng trọ thông minh · Vinh Long</p>
              </div>
            </div>

            {/* Nav links */}
            {NAV_LINKS.map(({ to, label, exact, highlight }) => (
              <Link
                key={to} to={to}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(to, exact)
                    ? 'bg-primary/10 text-primary'
                    : highlight
                      ? 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                      : 'hover:bg-muted text-foreground'
                )}
              >
                {label}
                {highlight && <Sparkles className="h-3.5 w-3.5" />}
              </Link>
            ))}

            <Separator className="my-2" />

            {isAuth ? (
              <>
                {/* User profile row */}
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted transition-colors"
                >
                  {user?.avatar
                    ? <img src={user.avatar} className="h-9 w-9 rounded-full object-cover shrink-0" alt="" />
                    : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-base font-bold shrink-0">
                        {(user?.name || 'U')[0].toUpperCase()}
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name || 'Tài khoản'}</p>
                    <p className={cn('text-xs font-medium', ROLE_LABEL[user?.role]?.cls)}>
                      {ROLE_LABEL[user?.role]?.text || user?.role}
                    </p>
                  </div>
                </Link>

                {/* Quick links grid */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { to: '/favorites',    icon: Heart,    label: 'Yêu thích' },
                    { to: '/appointments', icon: Calendar, label: 'Lịch hẹn' },
                    { to: '/messages',     icon: MessageCircle, label: 'Tin nhắn',
                      badge: unreadMsgs > 0 ? unreadMsgs : null },
                    ...(user?.role === 'landlord' ? [
                      { to: '/landlord/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
                      { to: '/landlord/rooms',        icon: Building2,       label: 'Phòng trọ' },
                      { to: '/landlord/appointments', icon: Calendar,        label: 'QL lịch hẹn' },
                    ] : []),
                    ...(user?.role === 'admin' ? [
                      { to: '/admin', icon: Shield, label: 'Admin' },
                    ] : []),
                  ].map(({ to, icon: Icon, label, badge }) => (
                    <Link
                      key={to} to={to}
                      className="relative flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 py-3 text-xs font-medium hover:bg-muted hover:border-primary/30 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-center leading-tight">{label}</span>
                      {badge && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

                {user?.role === 'landlord' && (
                  <Button asChild className="w-full mt-1 rounded-xl" size="sm">
                    <Link to="/landlord/rooms/create">+ Đăng phòng mới</Link>
                  </Button>
                )}

                <Separator className="my-2" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />Đăng xuất
                </button>
              </>
            ) : (
              <>
                <p className="px-3 py-1 text-xs text-muted-foreground">
                  Đăng nhập để lưu phòng yêu thích, nhận gợi ý và đặt lịch xem phòng.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" asChild className="rounded-xl">
                    <Link to="/login">Đăng nhập</Link>
                  </Button>
                  <Button asChild className="rounded-xl">
                    <Link to="/register">Đăng ký miễn phí</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
