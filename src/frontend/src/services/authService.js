import axiosInstance from '@/services/axiosInstance'

// Đăng ký tài khoản
export const registerApi = (data) => axiosInstance.post('/api/auth/register', data)

// Đăng nhập
export const loginApi = (data) => axiosInstance.post('/api/auth/login', data)

// Đăng xuất
export const logoutApi = () => axiosInstance.post('/api/auth/logout')

// Quên mật khẩu — gửi email
export const forgotPasswordApi = (email) =>
  axiosInstance.post('/api/auth/forgot-password', { email })

// Đặt lại mật khẩu
export const resetPasswordApi = (token, password) =>
  axiosInstance.post('/api/auth/reset-password', { token, password })

// Xác thực email
export const verifyEmailApi = (token) => axiosInstance.get(`/api/auth/verify-email/${token}`)

// Lấy thông tin user hiện tại
export const getMeApi = () => axiosInstance.get('/api/auth/me')
