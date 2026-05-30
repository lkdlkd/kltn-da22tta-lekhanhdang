import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'sonner'
import { registerApi, finalizeRoleApi, googleLoginApi } from '@/services/authService'
import { loginSuccess } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardFooter } from '@/components/ui/card'
import { AlertCircle, Building2, GraduationCap, Loader2, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import {
  AuthCard,
  AuthShell,
  AuthStatusCard,
  FormField,
  PasswordField,
  SubmitButton,
} from '@/pages/auth/components/AuthLayout'
import { cn } from '@/lib/utils'

const schema = yup.object({
  name: yup.string().min(2, 'Tên tối thiểu 2 ký tự').required('Vui lòng nhập họ tên'),
  email: yup.string().email('Email không hợp lệ').required('Vui lòng nhập email'),
  password: yup.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').required('Vui lòng nhập mật khẩu'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp')
    .required('Vui lòng xác nhận mật khẩu'),
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

function RoleOption({ active, icon: Icon, title, description, onClick, id, disabled }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-28 flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
    </button>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState('register') // 'register' | 'select-role' | 'verify-email'
  const [registeredUser, setRegisteredUser] = useState(null)
  const [pendingEmail, setPendingEmail] = useState('')
  const [apiError, setApiError] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleTokenVal, setGoogleTokenVal] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  })

  const onSubmit = async (data) => {
    setApiError('')
    try {
      const res = await registerApi(data)
      
      // Nếu là Admin / User đầu tiên, backend đã trả về Token để đăng nhập trực tiếp
      if (res.data?.data?.token) {
        dispatch(loginSuccess(res.data.data))
        toast.success('Chào mừng Quản trị viên đầu tiên của hệ thống!')
        navigate('/')
        return
      }

      const user = res.data.data?.user
      if (user) {
        setRegisteredUser(user)
        setStep('select-role')
        toast.success('Đăng ký thành công! Hãy chọn vai trò của bạn')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng ký thất bại'
      setApiError(message)
      toast.error(message)
    }
  }

  const handleRoleSelect = async (role) => {
    if (!registeredUser) return
    setRoleLoading(true)
    setApiError('')
    try {
      const res = await finalizeRoleApi({ email: registeredUser.email, role })

      if (res.data.data?.token) {
        dispatch(loginSuccess(res.data.data))
        toast.success('Thiết lập vai trò thành công! Chào mừng bạn')
        navigate('/')
        return
      }

      if (res.data.data?.requireEmailVerification) {
        setPendingEmail(registeredUser.email)
        setStep('verify-email')
        toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể thiết lập vai trò'
      setApiError(message)
      toast.error(message)
    } finally {
      setRoleLoading(false)
    }
  }

  const handleGoogleRegister = () => {
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
              setRegisteredUser(user)
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
    <AuthShell
      title="Tạo tài khoản"
      description="Tham gia Phòng Trọ TVU để bắt đầu trải nghiệm tốt nhất."
      asideTitle="Bắt đầu với tài khoản phù hợp cho nhu cầu của bạn."
      asideDescription="Sinh viên có thể lưu phòng và đặt lịch xem. Chủ trọ có thể đăng tin, quản lý lịch hẹn và trao đổi với người thuê."
      asideItems={[
        { icon: GraduationCap, title: 'Người thuê', desc: 'Tìm phòng, lưu tin và đặt lịch nhanh.' },
        { icon: Building2, title: 'Chủ trọ', desc: 'Đăng phòng và quản lý khách liên hệ.' },
        { icon: MessageCircle, title: 'Trao đổi', desc: 'Chat trực tiếp trong hệ thống.' },
      ]}
      footerPrompt="Đã có tài khoản?"
      footerLinkText="Đăng nhập"
      footerLinkTo="/login"
      className="items-start pt-4 sm:pt-8 lg:items-center lg:pt-2"
    >
      {step === 'verify-email' && (
        <AuthStatusCard
          icon={Mail}
          tone="primary"
          title="Kiểm tra email của bạn"
          description="Chúng tôi đã gửi liên kết xác thực để kích hoạt tài khoản chủ trọ."
        >
          <div className="rounded-lg border bg-muted/40 p-4 text-left">
            <p className="text-xs font-medium uppercase text-muted-foreground">Email nhận xác thực</p>
            <p className="mt-1 break-all text-sm font-semibold text-foreground">{pendingEmail}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Liên kết có hiệu lực trong 24 giờ. Nếu không thấy email, vui lòng kiểm tra thư mục Spam hoặc Junk.
            </p>
          </div>
          <Button variant="outline" asChild className="h-11 w-full rounded-lg">
            <Link to="/login">Quay lại đăng nhập</Link>
          </Button>
        </AuthStatusCard>
      )}

      {step === 'select-role' && (
        <AuthCard
          icon={Building2}
          title="Bạn tham gia với vai trò"
          description="Vui lòng chọn vai trò để hệ thống cung cấp giao diện phù hợp nhất."
        >
          <div className="space-y-6 px-6 py-6">
            {apiError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 font-semibold leading-relaxed">{apiError}</div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <RoleOption
                id="role-student"
                active={false}
                icon={GraduationCap}
                title="Sinh viên / Người thuê"
                description="Tìm phòng nhanh chóng quanh TVU, lưu tin yêu thích và đặt lịch hẹn xem phòng."
                onClick={() => handleRoleSelect('student')}
                disabled={roleLoading}
              />
              <RoleOption
                id="role-landlord"
                active={false}
                icon={Building2}
                title="Chủ trọ / Người cho thuê"
                description="Đăng tin cho thuê phòng trọ miễn phí, quản lý lịch hẹn trực tuyến."
                onClick={() => handleRoleSelect('landlord')}
                disabled={roleLoading}
              />
            </div>

            {roleLoading && (
              <p className="text-center text-xs text-muted-foreground animate-pulse font-medium">
                Đang thiết lập vai trò tài khoản, vui lòng đợi...
              </p>
            )}
          </div>
        </AuthCard>
      )}

      {step === 'register' && (
        <AuthCard
          icon={ShieldCheck}
          title="Tạo tài khoản"
          description="Thông tin này giúp hệ thống bảo vệ tài khoản của bạn."
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              <Button
                id="btn-google-register"
                type="button"
                variant="outline"
                className="h-11 w-full rounded-lg"
                onClick={handleGoogleRegister}
              >
                <GoogleIcon className="h-4 w-4" />
                Đăng ký với Google
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

              <FormField id="register-name" label="Họ và tên" error={errors.name?.message}>
                <Input
                  id="register-name"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  className={cn(
                    'h-11 rounded-lg transition-all duration-300',
                    errors.name ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'
                  )}
                  {...register('name')}
                />
              </FormField>

              <FormField id="register-email" label="Email" error={errors.email?.message}>
                <Input
                  id="register-email"
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
                id="register-password"
                label="Mật khẩu"
                autoComplete="new-password"
                register={register('password')}
                error={errors.password?.message}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />

              <FormField id="register-confirm-password" label="Xác nhận mật khẩu" error={errors.confirmPassword?.message}>
                <Input
                  id="register-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn(
                    'h-11 rounded-lg transition-all duration-300',
                    errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'
                  )}
                  {...register('confirmPassword')}
                />
              </FormField>
            </CardContent>

            <CardContent className="pt-0">
              <SubmitButton id="btn-register-submit" loading={isSubmitting} loadingText="Đang tạo tài khoản...">
                Đăng ký
              </SubmitButton>
            </CardContent>
          </form>
        </AuthCard>
      )}
    </AuthShell>
  )
}
