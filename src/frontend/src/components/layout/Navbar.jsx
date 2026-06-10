import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { logout, selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSlice'
import { logoutApi } from '@/services/authService'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BedDouble,
  Building2,
  Calendar,
  ChevronDown,
  Compass,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Shield,
  Sun,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { MessageDropdown } from '@/components/chat/MessageDropdown'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ', exact: true, icon: null },
  { to: '/search', label: 'Tìm phòng', icon: Search },
  { to: '/recommend', label: 'Gợi ý', icon: Compass },
]
const LANDLORD_MENU = [
  { to: '/landlord/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/landlord/rooms', icon: Building2, label: 'Quản lý phòng' },
  { to: '/landlord/appointments', icon: Calendar, label: 'Lịch hẹn' },
]
const ROLE_LABEL = {
  student: { text: 'Sinh viên', cls: 'text-blue-600 dark:text-blue-400' },
  landlord: { text: 'Chủ trọ', cls: 'text-emerald-600 dark:text-emerald-400' },
  admin: { text: 'Quản trị viên', cls: 'text-orange-600 dark:text-orange-400' },
}
function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <BedDouble className="h-5 w-5" />
      </div>
      <div className="leading-none">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-extrabold tracking-tight text-foreground">Phòng Trọ</span>
          <span className="text-sm font-extrabold text-primary">TVU</span>
        </div>
        <p className="mt-1 hidden text-[10px] font-medium text-muted-foreground sm:block">
          Tìm phòng trọ thông minh tại Vĩnh Long
        </p>
      </div>
    </Link>
  )
}
function LandlordDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const isActive = location.pathname.startsWith('/landlord')

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const handler = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        <Building2 className="h-4 w-4" />
        Quản lý
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border bg-background p-1.5 shadow-lg">
          {LANDLORD_MENU.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                location.pathname.startsWith(to)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-primary/10 hover:text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Separator className="my-1.5" />
          <Link
            to="/landlord/rooms/create"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Building2 className="h-4 w-4" />
            Đăng phòng mới
          </Link>
        </div>
      )}
    </div>
  )
}

function UserDropdown({ user, handleLogout, unreadMsgs }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const handler = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((val) => !val)}
        className="hidden h-9 items-center gap-2 rounded-lg border px-2 md:inline-flex"
      >
        {user?.avatar ? (
          <img src={user.avatar} className="h-6 w-6 rounded-full object-cover" alt="" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(user?.name || 'U')[0].toUpperCase()}
          </span>
        )}
        <span className="max-w-24 truncate text-xs font-medium">{user?.name?.split(' ').pop() || 'Tôi'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform text-muted-foreground', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border bg-background p-1.5 shadow-lg">
          <div className="px-3 py-2 text-left">
            <p className="truncate text-sm font-semibold">{user?.name || 'Tài khoản'}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user?.email || ''}</p>
          </div>
          <Separator className="my-1" />

          <Link
            to="/profile"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <User className="h-4 w-4" />
            Trang cá nhân
          </Link>

          <Link
            to="/messages"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="flex-1">Tin nhắn</span>
            {unreadMsgs > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                {unreadMsgs > 9 ? '9+' : unreadMsgs}
              </span>
            )}
          </Link>

          <Link
            to="/appointments"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Lịch hẹn
          </Link>

          <Link
            to="/favorites"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Heart className="h-4 w-4" />
            Yêu thích
          </Link>

          {user?.role === 'landlord' && (
            <>
              <Separator className="my-1" />
              <Link
                to="/landlord/dashboard"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Tổng quan chủ trọ
              </Link>
              <Link
                to="/landlord/rooms"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Quản lý phòng
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Separator className="my-1" />
              <Link
                to="/admin"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Shield className="h-4 w-4" />
                Quản trị hệ thống
              </Link>
            </>
          )}

          <Separator className="my-1" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

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

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
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

  const mobileQuickLinks = isAuth
    ? [
      { to: '/favorites', icon: Heart, label: 'Yêu thích' },
      { to: '/appointments', icon: Calendar, label: 'Lịch hẹn' },
      { to: '/messages', icon: MessageCircle, label: 'Tin nhắn', badge: unreadMsgs > 0 ? unreadMsgs : null },
      ...(user?.role === 'landlord' ? [
        { to: '/landlord/dashboard', icon: LayoutDashboard, label: 'Tổng quan chủ trọ' },
        { to: '/landlord/rooms', icon: Building2, label: 'Phòng trọ của tôi' },
        { to: '/landlord/appointments', icon: Calendar, label: 'Quản lý lịch hẹn' },
      ] : []),
      ...(user?.role === 'admin' ? [{ to: '/admin', icon: Shield, label: 'Quản trị hệ thống' }] : []),
    ]
    : []

  return (
    <header ref={navRef} className="fixed inset-x-0 top-0 z-50 w-full border-b border-border/70 bg-background/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ to, label, exact, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                isActive(to, exact)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </Link>
          ))}
          {/* {isAuth && user?.role === 'landlord' && <LandlordDropdown />} */}
          {/* {isAuth && user?.role === 'admin' && (
            <Link
              to="/admin"
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                isActive('/admin') ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' : 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30'
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )} */}
        </nav>

        <div className="flex-1" />

        {isAuth && user?.role === 'landlord' && (
          <Button size="sm" asChild className="hidden h-9 rounded-lg lg:inline-flex">
            <Link to="/landlord/rooms/create">
              <Building2 className="h-4 w-4" />
              Đăng phòng
            </Link>
          </Button>
        )}

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 rounded-lg md:inline-flex"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Đổi giao diện"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        {isAuth ? (
          <>
            <MessageDropdown />
            <NotificationDropdown />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" asChild>
              <Link to="/favorites" title="Phòng yêu thích">
                <Heart className="h-4 w-4" />
              </Link>
            </Button>
            <UserDropdown user={user} handleLogout={handleLogout} unreadMsgs={unreadMsgs} />
          </>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="sm" asChild className="h-9 rounded-lg">
              <Link to="/login">Đăng nhập</Link>
            </Button>
            <Button size="sm" asChild className="h-9 rounded-lg">
              <Link to="/register">Đăng ký miễn phí</Link>
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg lg:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-[60] lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/45 transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileOpen(false)}
        />

        <aside
          className={cn(
            'absolute left-0 top-0 flex h-dvh w-[min(84vw,22rem)] flex-col border-r bg-background shadow-2xl transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Brand />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-1">
              {NAV_LINKS.map(({ to, label, exact, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    isActive(to, exact) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-primary/10 hover:text-primary'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {label}
                </Link>
              ))}
            </div>

            <Separator className="my-4" />

            {isAuth ? (
              <div className="space-y-4">
                <Link to="/profile" className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted/40">
                  {user?.avatar ? (
                    <img src={user.avatar} className="h-11 w-11 rounded-full object-cover" alt="" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {(user?.name || 'U')[0].toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user?.name || 'Tài khoản'}</p>
                    <p className={cn('text-xs font-medium', ROLE_LABEL[user?.role]?.cls)}>
                      {ROLE_LABEL[user?.role]?.text || user?.role}
                    </p>
                  </div>
                </Link>

                <div className="space-y-1">
                  {mobileQuickLinks.map(({ to, icon: Icon, label, badge }) => (
                    <Link
                      key={to}
                      to={to}
                      className="relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {badge && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

                {user?.role === 'landlord' && (
                  <Button asChild className="h-10 w-full rounded-lg">
                    <Link to="/landlord/rooms/create">
                      <Building2 className="h-4 w-4" />
                      Đăng phòng mới
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="rounded-xl border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                  Đăng nhập để lưu phòng yêu thích, đặt lịch xem phòng và nhận gợi ý phù hợp hơn.
                </p>
                <Button asChild className="h-10 w-full rounded-lg">
                  <Link to="/login">
                    <User className="h-4 w-4" />
                    Đăng nhập
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-10 w-full rounded-lg">
                  <Link to="/register">Đăng ký miễn phí</Link>
                </Button>
              </div>
            )}

            {mounted && (
              <div className="mt-6 rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giao diện</span>
                  <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex h-7 px-2.5 items-center gap-1.5 rounded-md text-xs font-medium transition-all',
                        theme === 'light' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      Sáng
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex h-7 px-2.5 items-center gap-1.5 rounded-md text-xs font-medium transition-all',
                        theme === 'dark' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      Tối
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isAuth && (
            <div className="border-t p-4">
              <button
                onClick={handleLogout}
                className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </aside>
      </div>
    </header>
  )
}
