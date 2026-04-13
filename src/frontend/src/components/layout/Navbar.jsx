import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { logout, selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSlice'
import { logoutApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import {
  Home, MessageCircle, User, LogOut, Shield, Building2,
  Moon, Sun, Heart, Calendar, Search, Menu, X, Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Trang chủ', exact: true },
  { to: '/search', label: 'Tìm phòng' },
  { to: '/recommend', label: 'Gợi ý AI' },
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const isAuth = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [location.pathname])

  // close menu on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    try { await logoutApi() } catch {}
    dispatch(logout())
    toast.success('Đã đăng xuất')
    navigate('/login')
  }

  const isActive = (to, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md shadow-sm" ref={menuRef}>
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 gap-3">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold text-primary mr-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="h-3.5 w-3.5" />
          </div>
          <span className="text-base tracking-tight hidden sm:block">PhòngTrọ VL</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
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
        </nav>

        {/* Right side — always right-aligned */}
        <div className="flex items-center gap-0.5 ml-auto">

          {/* Theme */}
          {mounted && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Đổi theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {isAuth ? (
            <>
              {/* Search — desktop only */}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden sm:flex" asChild title="Tìm kiếm">
                <Link to="/search"><Search className="h-4 w-4" /></Link>
              </Button>

              {/* Messages */}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild title="Tin nhắn">
                <Link to="/messages"><MessageCircle className="h-4 w-4" /></Link>
              </Button>

              {/* Notifications */}
              <NotificationDropdown />

              {/* Admin */}
              {user?.role === 'admin' && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden sm:flex" asChild title="Admin">
                  <Link to="/admin"><Shield className="h-4 w-4" /></Link>
                </Button>
              )}

              {/* Landlord */}
              {user?.role === 'landlord' && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden sm:flex" asChild title="Quản lý phòng">
                  <Link to="/landlord/rooms"><Building2 className="h-4 w-4" /></Link>
                </Button>
              )}

              {/* Favorites — desktop */}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden sm:flex" asChild title="Yêu thích">
                <Link to="/favorites"><Heart className="h-4 w-4" /></Link>
              </Button>

              {/* User avatar pill — desktop */}
              <Button variant="ghost" size="sm" asChild
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-full pl-1.5 pr-2.5 ml-1">
                <Link to="/profile">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium max-w-[72px] truncate hidden lg:block">
                    {user?.name?.split(' ').pop() || 'Tôi'}
                  </span>
                </Link>
              </Button>

              {/* Logout — desktop */}
              <Button variant="ghost" size="icon"
                className="h-8 w-8 rounded-full hidden sm:flex text-muted-foreground hover:text-destructive"
                onClick={handleLogout} title="Đăng xuất">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              <Button variant="ghost" size="sm" asChild className="h-8 rounded-full text-sm">
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button size="sm" asChild className="h-8 rounded-full text-sm shadow-sm">
                <Link to="/register">Đăng ký</Link>
              </Button>
            </div>
          )}

          {/* Hamburger — mobile */}
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 rounded-full sm:hidden ml-1"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t bg-background shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {/* Nav links */}
            {NAV_LINKS.map(({ to, label, exact }) => (
              <Link key={to} to={to}
                className={cn(
                  'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(to, exact) ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                )}>
                {label}
              </Link>
            ))}

            {isAuth ? (
              <>
                <div className="h-px bg-border my-2" />
                <Link to="/profile" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user?.name || 'Tài khoản'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </Link>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { to: '/favorites', icon: Heart, label: 'Yêu thích' },
                    { to: '/appointments', icon: Calendar, label: 'Lịch hẹn' },
                    { to: '/search', icon: Search, label: 'Tìm phòng' },
                    ...(user?.role === 'landlord' ? [
                      { to: '/landlord/rooms', icon: Building2, label: 'Phòng trọ' },
                      { to: '/landlord/appointments', icon: Calendar, label: 'QL Lịch hẹn' },
                    ] : []),
                    ...(user?.role === 'admin' ? [
                      { to: '/admin', icon: Shield, label: 'Admin' },
                    ] : []),
                  ].map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to}
                      className="flex flex-col items-center gap-1 rounded-xl border bg-muted/40 py-2.5 text-xs font-medium hover:bg-muted transition-colors">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-center leading-tight">{label}</span>
                    </Link>
                  ))}
                </div>
                <div className="h-px bg-border my-2" />
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut className="h-4 w-4" />Đăng xuất
                </button>
              </>
            ) : (
              <>
                <div className="h-px bg-border my-2" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" asChild className="rounded-xl"><Link to="/login">Đăng nhập</Link></Button>
                  <Button asChild className="rounded-xl"><Link to="/register">Đăng ký</Link></Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
