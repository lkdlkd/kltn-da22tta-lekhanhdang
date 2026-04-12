import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { logout, selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSlice'
import { logoutApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Home, MessageCircle, User, LogOut, Shield, Building2, Moon, Sun, Heart, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'

export function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      // ignore logout API error
    } finally {
      dispatch(logout())
      toast.success('Đã đăng xuất')
      navigate('/login')
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Home className="h-6 w-6" />
          <span>PhòngTrọ VL</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">Trang chủ</Link>
          <Link to="/search" className="text-foreground/80 hover:text-foreground transition-colors">Tìm kiếm</Link>
          <Link to="/recommend" className="text-foreground/80 hover:text-foreground transition-colors">Gợi ý cho bạn</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" asChild title="Tin nhắn">
                <Link to="/messages"><MessageCircle className="h-5 w-5" /></Link>
              </Button>
              <NotificationDropdown />
              {user?.role === 'admin' && (
                <Button variant="ghost" size="icon" asChild title="Admin">
                  <Link to="/admin"><Shield className="h-5 w-5" /></Link>
                </Button>
              )}
              {user?.role === 'landlord' && (
                <>
                  <Button variant="ghost" size="icon" asChild title="Quản lý phòng">
                    <Link to="/landlord/rooms"><Building2 className="h-5 w-5" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Lịch hẹn">
                    <Link to="/landlord/appointments"><Calendar className="h-5 w-5" /></Link>
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" asChild title="Yêu thích">
                <Link to="/favorites"><Heart className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild title="Hồ sơ">
                <Link to="/profile"><User className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Đăng xuất">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Đăng ký</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
