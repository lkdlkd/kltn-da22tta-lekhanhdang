import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'sonner'
import { forgotPasswordApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, Mail } from 'lucide-react'

const schema = yup.object({
  email: yup.string().email('Email không hợp lệ').required('Vui lòng nhập email'),
})

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await forgotPasswordApi(data.email)
      setSent(true)
      toast.success('Email reset mật khẩu đã được gửi!')
    } catch (err) {
      const message = err.response?.data?.message || 'Gửi email thất bại'
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Home className="h-8 w-8" />
            <span>PhòngTrọ VL</span>
          </Link>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
            <CardDescription>
              Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
            </CardDescription>
          </CardHeader>

          {sent ? (
            <CardContent className="text-center space-y-4 py-8">
              <div className="text-5xl">📧</div>
              <p className="text-muted-foreground">
                Email reset mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn (kể cả thư mục spam).
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay về đăng nhập
                </Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" placeholder="example@email.com" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button id="btn-forgot-submit" type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
                </Button>
                <Button variant="ghost" asChild className="w-full">
                  <Link to="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Quay lại đăng nhập
                  </Link>
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
