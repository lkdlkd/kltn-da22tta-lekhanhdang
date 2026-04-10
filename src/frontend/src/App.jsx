import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'sonner'
import { store } from '@/store'
import { PrivateRoute } from '@/components/PrivateRoute'
import { RoleRoute } from '@/components/RoleRoute'
import { Navbar } from '@/components/layout/Navbar'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'

// Placeholder pages (sẽ được implement trong các phase tiếp theo)
const HomePage = () => (
  <div className="container mx-auto px-4 py-16 text-center">
    <h1 className="text-4xl font-bold mb-4">🏠 PhòngTrọ Vĩnh Long</h1>
    <p className="text-muted-foreground text-lg">Hệ thống gợi ý phòng trọ thông minh cho sinh viên</p>
  </div>
)
const SearchPage = () => <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Tìm kiếm phòng trọ</h1></div>
const NotFoundPage = () => (
  <div className="container mx-auto px-4 py-16 text-center">
    <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
    <p className="text-xl">Trang không tồn tại</p>
  </div>
)

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Public routes — no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Public routes — with navbar */}
          <Route
            path="/"
            element={
              <AppLayout>
                <HomePage />
              </AppLayout>
            }
          />
          <Route
            path="/search"
            element={
              <AppLayout>
                <SearchPage />
              </AppLayout>
            }
          />

          {/* Protected routes — cần đăng nhập */}
          <Route element={<PrivateRoute />}>
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Hồ sơ cá nhân</h1></div>
                </AppLayout>
              }
            />
            <Route
              path="/favorites"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Phòng yêu thích</h1></div>
                </AppLayout>
              }
            />
            <Route
              path="/messages"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Tin nhắn</h1></div>
                </AppLayout>
              }
            />
            <Route
              path="/notifications"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Thông báo</h1></div>
                </AppLayout>
              }
            />
            <Route
              path="/appointments"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Lịch hẹn xem phòng</h1></div>
                </AppLayout>
              }
            />
          </Route>

          {/* Landlord routes */}
          <Route element={<RoleRoute roles={['landlord', 'admin']} />}>
            <Route
              path="/landlord/rooms"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Quản lý phòng trọ</h1></div>
                </AppLayout>
              }
            />
          </Route>

          {/* Admin routes */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route
              path="/admin"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Admin Dashboard</h1></div>
                </AppLayout>
              }
            />
            <Route
              path="/admin/rooms"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Admin — Duyệt phòng</h1></div>
                </AppLayout>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AppLayout>
                  <div className="container mx-auto px-4 py-8"><h1 className="text-2xl font-bold">Admin — Quản lý users</h1></div>
                </AppLayout>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
