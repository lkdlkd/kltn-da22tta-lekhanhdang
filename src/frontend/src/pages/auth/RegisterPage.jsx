import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'sonner'
import { registerApi } from '@/services/authService'
import { loginSuccess } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Home, GraduationCap, Building2, Mail } from 'lucide-react'

const schema = yup.object({
  name: yup.string().min(2, 'Tên tối thiểu 2 ký tự').required('Vui lòng nhập họ tên'),
  email: yup.string().email('Email không hợp lệ').required('Vui lòng nhập email'),
  password: yup.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').required('Vui lòng nhập mật khẩu'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp')
    .required('Vui lòng xác nhận mật khẩu'),
  role: yup.string().oneOf(['student', 'landlord']).required('Vui lòng chọn loại tài khoản'),
})

export default function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [showPassword, setShowPassword] = useState(false)
  const [landlordVerifyPending, setLandlordVerifyPending] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { role: 'student' },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data) => {
    try {
      const res = await registerApi(data)

      // Sinh viên: backend trả về token → đăng nhập luôn
      if (res.data.data?.token) {
        dispatch(loginSuccess(res.data.data))
        toast.success('Đăng ký thành công! Chào mừng bạn 🎉')
        navigate('/')
        return
      }

      // Chủ trọ: backend yêu cầu xác minh email
      if (res.data.data?.requireEmailVerification) {
        setPendingEmail(data.email)
        setLandlordVerifyPending(true)
        toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản 📧')
        return
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng ký thất bại'
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Home className="h-8 w-8" />
            <span>PhòngTrọ VL</span>
          </Link>
        </div>

        {/* Màn hình chờ xác thực email — chỉ hiện cho chủ trọ sau khi đăng ký */}
        {landlordVerifyPending ? (
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
            <CardContent className="text-center space-y-5 py-10">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Kiểm tra email của bạn</h2>
                <p className="text-sm text-muted-foreground">
                  Chúng tôi đã gửi link xác thực đến
                </p>
                <p className="font-medium text-primary">{pendingEmail}</p>
                <p className="text-sm text-muted-foreground">
                  Vui lòng click vào link trong email để kích hoạt tài khoản Chủ trọ.<br />
                  Link có hiệu lực trong <strong>24 giờ</strong>.
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                Không thấy email? Kiểm tra thư mục <strong>Spam / Junk</strong>
              </div>
              <Button variant="outline" asChild className="w-full">
                <Link to="/login">Quay lại đăng nhập</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
            <CardDescription>Đăng ký để bắt đầu tìm phòng trọ phù hợp</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Bạn là</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="role-student"
                    onClick={() => setValue('role', 'student')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      selectedRole === 'student'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <GraduationCap className="h-6 w-6" />
                    <span className="text-sm font-medium">Sinh viên</span>
                    <span className="text-xs text-muted-foreground">Đăng nhập ngay</span>
                  </button>
                  <button
                    type="button"
                    id="role-landlord"
                    onClick={() => setValue('role', 'landlord')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      selectedRole === 'landlord'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Building2 className="h-6 w-6" />
                    <span className="text-sm font-medium">Chủ trọ</span>
                    <span className="text-xs text-muted-foreground">Cần xác minh email</span>
                  </button>
                </div>
                {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
              </div>


              <div className="space-y-2">
                <Label htmlFor="register-name">Họ và tên</Label>
                <Input id="register-name" placeholder="Nguyễn Văn A" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" placeholder="example@email.com" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Xác nhận mật khẩu</Label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                id="btn-register-submit"
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Đăng nhập
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        )}
      </div>
    </div>
  )
}
