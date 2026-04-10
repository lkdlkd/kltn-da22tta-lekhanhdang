import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSlice'
import { logoutApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Home, Bell, MessageCircle, User, LogOut, Shield, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)

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
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/messages"><MessageCircle className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/notifications"><Bell className="h-5 w-5" /></Link>
              </Button>
              {user?.role === 'admin' && (
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/admin"><Shield className="h-5 w-5" /></Link>
                </Button>
              )}
              {user?.role === 'landlord' && (
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/landlord/rooms"><Building2 className="h-5 w-5" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile"><User className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
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
