import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSlice'

/**
 * RoleRoute — bảo vệ route theo role
 * @param {string[]} roles — danh sách role được phép (vd: ['admin', 'landlord'])
 */
export function RoleRoute({ roles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />

  return <Outlet />
}
