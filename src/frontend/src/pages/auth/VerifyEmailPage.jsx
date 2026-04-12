import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmailApi } from '@/services/authService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link xác thực không hợp lệ.')
      return
    }

    if (hasFetched.current) return
    hasFetched.current = true

    const verify = async () => {
      try {
        const res = await verifyEmailApi(token)
        setMessage(res.data.message || 'Xác thực email thành công!')
        setStatus('success')
      } catch (err) {
        setMessage(err.response?.data?.message || 'Link xác thực không hợp lệ hoặc đã hết hạn.')
        setStatus('error')
      }
    }

    verify()
  }, [token])

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
          <CardContent className="text-center space-y-6 py-12 px-8">

            {/* Loading */}
            {status === 'loading' && (
              <>
                <div className="flex justify-center">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold">Đang xác thực email...</h1>
                  <p className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</p>
                </div>
              </>
            )}

            {/* Success */}
            {status === 'success' && (
              <>
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-14 w-14 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
                    Xác thực thành công!
                  </h1>
                  <p className="text-sm text-muted-foreground">{message}</p>
                  <p className="text-sm text-muted-foreground">
                    Tài khoản chủ trọ của bạn đã được kích hoạt. Bạn có thể đăng nhập và bắt đầu đăng tin phòng trọ.
                  </p>
                </div>
                <Button asChild className="w-full" id="btn-verify-login">
                  <Link to="/login">Đăng nhập ngay →</Link>
                </Button>
              </>
            )}

            {/* Error */}
            {status === 'error' && (
              <>
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                    <XCircle className="h-14 w-14 text-red-500 dark:text-red-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                    Xác thực thất bại
                  </h1>
                  <p className="text-sm text-muted-foreground">{message}</p>
                  <p className="text-sm text-muted-foreground">
                    Link xác thực chỉ có hiệu lực trong <strong>24 giờ</strong>. Vui lòng đăng ký lại nếu link đã hết hạn.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/register">Đăng ký lại</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/">Về trang chủ</Link>
                  </Button>
                </div>
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
