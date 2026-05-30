import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'sonner'
import { loginApi, getMeApi, finalizeRoleApi, googleLoginApi } from '@/services/authService'
import { loginStart, loginSuccess, loginFailure } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardFooter } from '@/components/ui/card'
import { AlertCircle, Building2, GraduationCap, Loader2, Mail, MapPinned, Search, Sparkles } from 'lucide-react'
import {
  AuthCard,
  AuthShell,
  FormField,
  PasswordField,
  SubmitButton,
} from '@/pages/auth/components/AuthLayout'
import { cn } from '@/lib/utils'

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}`
}

const BACKEND_URL = `${getApiBaseUrl()}/api`

const schema = yup.object({
  email: yup.string().email('Email không hợp lệ').required('Vui lòng nhập email'),
  password: yup.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').required('Vui lòng nhập mật khẩu'),
})

const GOOGLE_PATHS = [
  ['#4285F4', 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'],
  ['#34A853', 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'],
  ['#FBBC05', 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'],
  ['#EA4335', 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'],
]

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {GOOGLE_PATHS.map(([fill, d]) => <path key={fill} fill={fill} d={d} />)}
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Quy trình gán vai trò của Google
  const [step, setStep] = useState('login') // 'login' | 'select-role'
  const [googleUser, setGoogleUser] = useState(null)
  const [googleTokenVal, setGoogleTokenVal] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      toast.error('Đăng nhập Google thất bại, vui lòng thử lại')
      return
    }

    if (!token) return

    const handleGoogleToken = async () => {
      setGoogleLoading(true)
      try {
        localStorage.setItem('token', token)
        const res = await getMeApi()
        const user = res.data?.data?.user
        if (!user) throw new Error()

        // Nếu người dùng Google mới đăng ký và chưa chọn vai trò
        if (user.role === 'unassigned') {
          setGoogleUser(user)
          setGoogleTokenVal(token)
          setStep('select-role')
        } else {
          dispatch(loginSuccess({ token, user }))
          toast.success(`Chào mừng ${user.name}!`)
          navigate('/', { replace: true })
        }
      } catch {
        localStorage.removeItem('token')
        toast.error('Đăng nhập Google thất bại')
      } finally {
        setGoogleLoading(false)
      }
    }

    handleGoogleToken()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    dispatch(loginStart())
    setApiError('')
    try {
      const res = await loginApi(data)
      dispatch(loginSuccess(res.data.data))
      toast.success('Đăng nhập thành công! Chào mừng bạn trở lại')
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại'
      dispatch(loginFailure(message))
      setApiError(message)
      toast.error(message)
    }
  }

  const handleRoleSelect = async (role) => {
    if (!googleUser || !googleTokenVal) return
    setRoleLoading(true)
    setApiError('')
    try {
      await finalizeRoleApi({ email: googleUser.email, role })

      // Do tài khoản Google đã được kích hoạt email sẵn từ trước, 
      // hệ thống chỉ việc cấp quyền truy cập trực tiếp
      const finalUser = { ...googleUser, role }
      dispatch(loginSuccess({ token: googleTokenVal, user: finalUser }))
      toast.success('Thiết lập vai trò thành công! Chào mừng bạn')
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể thiết lập vai trò'
      setApiError(message)
      toast.error(message)
    } finally {
      setRoleLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    if (!window.google?.accounts?.oauth2) {
      toast.error('Dịch vụ liên kết Google đang được tải, vui lòng thử lại sau vài giây!')
      return
    }

    setGoogleLoading(true)
    setApiError('')

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
            const res = await googleLoginApi({ accessToken: tokenResponse.access_token })
            const { token, user } = res.data.data

            if (user.role === 'unassigned') {
              setGoogleUser(user)
              setGoogleTokenVal(token)
              setStep('select-role')
            } else {
              dispatch(loginSuccess({ token, user }))
              toast.success(`Chào mừng ${user.name}!`)
              navigate('/', { replace: true })
            }
          } catch (err) {
            const message = err.response?.data?.message || 'Đăng nhập Google thất bại'
            setApiError(message)
            toast.error(message)
          } finally {
            setGoogleLoading(false)
          }
        } else {
          setGoogleLoading(false)
          toast.error('Đăng nhập Google thất bại, vui lòng thử lại')
        }
      },
      error_callback: (err) => {
        setGoogleLoading(false)
        console.error(err)
        toast.error('Có lỗi xảy ra khi kết nối Google')
      }
    })
    client.requestAccessToken()
  }

  if (googleLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Đang kết nối tài khoản Google...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {step === 'select-role' ? (
        <AuthShell
          title="Chọn vai trò của bạn"
          description="Để bắt đầu, hãy chọn vai trò phù hợp nhất với nhu cầu của bạn."
          asideTitle="Chào mừng bạn đến với Phòng Trọ TVU."
          asideDescription="Để tiếp tục sử dụng dịch vụ bằng tài khoản Google, hãy xác định vai trò của bạn."
          asideItems={[
            { icon: Search, title: 'Tìm nhanh', desc: 'Lọc theo giá, vị trí và tiện ích.' },
            { icon: Sparkles, title: 'Gợi ý AI', desc: 'Ưu tiên phòng hợp nhu cầu.' },
            { icon: MapPinned, title: 'Theo khu vực', desc: 'Tập trung vào các điểm gần bạn.' },
          ]}
        >
          <AuthCard
            icon={Building2}
            title="Bạn tham gia với vai trò"
            description="Lựa chọn vai trò phù hợp để hệ thống thiết lập bảng điều khiển cho bạn."
          >
            <div className="space-y-6 px-6 py-6">
              {apiError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div className="flex-1 font-semibold leading-relaxed">{apiError}</div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  id="google-role-student"
                  onClick={() => handleRoleSelect('student')}
                  disabled={roleLoading}
                  className="flex min-h-28 flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
                >
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Sinh viên / Người thuê</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Tìm phòng trọ, lưu danh sách yêu thích và đặt lịch hẹn xem.
                  </span>
                </button>
                <button
                  type="button"
                  id="google-role-landlord"
                  onClick={() => handleRoleSelect('landlord')}
                  disabled={roleLoading}
                  className="flex min-h-28 flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
                >
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Chủ trọ / Cho thuê</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Đăng tin cho thuê phòng, quản lý các cuộc hẹn liên hệ.
                  </span>
                </button>
              </div>

              {roleLoading && (
                <p className="text-center text-xs text-muted-foreground animate-pulse font-medium">
                  Đang thiết lập vai trò tài khoản, vui lòng đợi...
                </p>
              )}
            </div>
          </AuthCard>
        </AuthShell>
      ) : (
        <AuthShell
          title="Chào mừng bạn trở lại"
          description="Đăng nhập để lưu phòng, đặt lịch xem và nhận gợi ý phù hợp hơn."
          asideTitle="Đăng nhập để tiếp tục hành trình tìm phòng phù hợp."
          asideDescription="Một tài khoản giúp bạn quản lý phòng yêu thích, lịch hẹn, tin nhắn và các đề xuất cá nhân hóa."
          asideItems={[
            { icon: Search, title: 'Tìm nhanh', desc: 'Lọc theo giá, vị trí và tiện ích.' },
            { icon: Sparkles, title: 'Gợi ý AI', desc: 'Ưu tiên phòng hợp nhu cầu.' },
            { icon: MapPinned, title: 'Theo khu vực', desc: 'Tập trung vào các điểm gần bạn.' },
          ]}
          footerPrompt="Chưa có tài khoản?"
          footerLinkText="Đăng ký"
          footerLinkTo="/register"
        >
          <AuthCard
            icon={Mail}
            title="Đăng nhập"
            description="Nhập thông tin tài khoản Phòng Trọ TVU của bạn."
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                <Button
                  id="btn-google-login"
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-lg"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon className="h-4 w-4" />
                  Đăng nhập với Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Hoặc dùng email</span>
                  </div>
                </div>

                {apiError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <div className="flex-1 font-semibold leading-relaxed">{apiError}</div>
                  </div>
                )}

                <FormField id="login-email" label="Email" error={errors.email?.message}>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    className={cn(
                      'h-11 rounded-lg transition-all duration-300',
                      errors.email ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'
                    )}
                    {...register('email')}
                  />
                </FormField>

                <PasswordField
                  id="login-password"
                  label="Mật khẩu"
                  autoComplete="current-password"
                  register={register('password')}
                  error={errors.password?.message}
                  show={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <SubmitButton id="btn-login-submit" loading={isSubmitting} loadingText="Đang đăng nhập...">
                  Đăng nhập
                </SubmitButton>
                <p className="text-center text-sm text-muted-foreground">
                  Bạn là chủ trọ?{' '}
                  <Link to="/register" className="font-semibold text-primary hover:underline">
                    Tạo tài khoản để đăng phòng
                  </Link>
                </p>
              </CardFooter>
            </form>
          </AuthCard>
        </AuthShell>
      )}
    </>
  )
}
