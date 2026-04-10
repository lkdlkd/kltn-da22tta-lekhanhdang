import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '@/features/auth/authSlice'

/**
 * PrivateRoute — bảo vệ route cần đăng nhập
 * Nếu chưa đăng nhập → redirect về /login
 */
export function PrivateRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
