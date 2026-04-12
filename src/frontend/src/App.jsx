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

// Room Pages
import LandlordRoomsPage from '@/pages/landlord/LandlordRoomsPage'
import RoomFormPage from '@/pages/landlord/RoomFormPage'
import RoomDetailPage from '@/pages/rooms/RoomDetailPage'
import SearchPage from '@/pages/search/SearchPage'
import HomePage from '@/pages/home/HomePage'

// Phase 5-9 Pages
import FavoritesPage from '@/pages/favorites/FavoritesPage'
import MessagesPage from '@/pages/messages/MessagesPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'

// Phase 10-13 Pages
import ProfilePage from '@/pages/profile/ProfilePage'
import AppointmentsPage from '@/pages/appointments/AppointmentsPage'
import ComparePage from '@/pages/compare/ComparePage'

// Compare Bar
import { CompareBar } from '@/components/compare/CompareBar'

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminRoomsPage from '@/pages/admin/AdminRoomsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage'
import AdminReportsPage from '@/pages/admin/AdminReportsPage'

const NotFoundPage = () => (
  <div className="container mx-auto px-4 py-16 text-center">
    <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
    <p className="text-xl">Trang không tồn tại</p>
  </div>
)

function AppLayout({ children, fullHeight = false }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className={fullHeight ? 'flex-1 overflow-hidden' : 'flex-1'}>{children}</main>
      <CompareBar />
    </div>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Auth routes — no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Public routes */}
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/search" element={<AppLayout fullHeight><SearchPage /></AppLayout>} />
          <Route path="/rooms/:slug" element={<AppLayout><RoomDetailPage /></AppLayout>} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
            <Route path="/favorites" element={<AppLayout><FavoritesPage /></AppLayout>} />
            <Route path="/messages" element={<AppLayout fullHeight><MessagesPage /></AppLayout>} />
            <Route path="/notifications" element={<AppLayout><NotificationsPage /></AppLayout>} />
            <Route path="/appointments" element={<AppLayout><AppointmentsPage /></AppLayout>} />
          </Route>

          <Route path="/compare" element={<AppLayout><ComparePage /></AppLayout>} />

          {/* Landlord routes */}
          <Route element={<RoleRoute roles={['landlord', 'admin']} />}>
            <Route path="/landlord/rooms" element={<AppLayout><LandlordRoomsPage /></AppLayout>} />
            <Route path="/landlord/rooms/create" element={<AppLayout><RoomFormPage /></AppLayout>} />
            <Route path="/landlord/rooms/:id/edit" element={<AppLayout><RoomFormPage /></AppLayout>} />
            <Route path="/landlord/appointments" element={<AppLayout><AppointmentsPage /></AppLayout>} />
          </Route>

          {/* Admin routes — nested layout */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route element={<AppLayout><AdminLayout /></AppLayout>}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/rooms" element={<AdminRoomsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
