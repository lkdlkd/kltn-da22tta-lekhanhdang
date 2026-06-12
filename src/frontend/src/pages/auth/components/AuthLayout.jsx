import { Link } from 'react-router-dom'
import { AlertCircle, BedDouble, CheckCircle2, Eye, EyeOff, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const DEFAULT_FEATURES = [
  {
    icon: Sparkles,
    title: 'Gợi ý phù hợp',
    desc: 'Ưu tiên phòng theo nhu cầu, ngân sách và khu vực bạn quan tâm.',
  },
  {
    icon: ShieldCheck,
    title: 'Tin đăng rõ ràng',
    desc: 'Thông tin phòng được trình bày dễ kiểm tra trước khi liên hệ.',
  },
  {
    icon: MapPin,
    title: 'Tập trung Vĩnh Long',
    desc: 'Tìm kiếm nhanh quanh trường, khu dân cư và tuyến đường quen thuộc.',
  },
]

export function AuthBrand({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm',
        compact ? 'h-9 w-9' : 'h-10 w-10'
      )}>
        <BedDouble className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <div className="leading-none">
        <div className="flex items-baseline gap-1">
          <span className={cn('font-extrabold tracking-tight text-foreground', compact ? 'text-sm' : 'text-base')}>
            Phòng Trọ
          </span>
          <span className={cn('font-extrabold text-primary', compact ? 'text-sm' : 'text-base')}>Sinh Viên</span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          Tìm phòng trọ thông minh tại Vĩnh Long
        </p>
      </div>
    </Link>
  )
}

export function AuthShell({
  children,
  title,
  description,
  asideTitle = 'Một tài khoản cho toàn bộ trải nghiệm tìm phòng.',
  asideDescription = 'Lưu phòng yêu thích, nhận đề xuất phù hợp, đặt lịch xem phòng và trao đổi trực tiếp với chủ trọ.',
  asideItems = DEFAULT_FEATURES,
  footerPrompt,
  footerLinkText,
  footerLinkTo,
  className,
}) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto grid min-h-svh w-full max-w-7xl lg:grid-cols-[1fr_500px]">
        <section className="hidden border-r bg-card lg:flex lg:flex-col">
          <div className="flex h-16 items-center px-8">
            <AuthBrand compact />
          </div>

          <div className="flex flex-1 items-center px-8 py-10">
            <div className="w-full max-w-xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Vĩnh Long · Phòng trọ · Gợi ý thông minh
              </div>

              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-foreground">
                  {asideTitle}
                </h1>
                <p className="max-w-md text-sm leading-7 text-muted-foreground">
                  {asideDescription}
                </p>
              </div>

              <div className="grid max-w-xl gap-3 sm:grid-cols-3">
                {asideItems.map(({ icon: Icon, title: itemTitle, desc }) => (
                  <div key={itemTitle} className="rounded-lg border bg-background p-4">
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold">{itemTitle}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex max-w-xl items-start gap-3 rounded-xl border bg-background p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Chủ trọ và người thuê dùng chung một hệ thống để quản lý lịch hẹn, tin nhắn và thông tin phòng.
                </p>
              </div>
            </div>
          </div>
        </section>

        <main className="flex min-h-svh flex-col">
          <div className="flex h-16 items-center justify-between px-4 sm:px-8 lg:justify-end">
            <div className="lg:hidden">
              <AuthBrand compact />
            </div>
            {footerPrompt && footerLinkText && footerLinkTo && (
              <p className="hidden text-sm text-muted-foreground sm:block">
                {footerPrompt}{' '}
                <Link to={footerLinkTo} className="font-semibold text-primary hover:underline">
                  {footerLinkText}
                </Link>
              </p>
            )}
          </div>

          <div className={cn('flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-8', className)}>
            <div className="w-full max-w-md">
              <div className="mb-6 lg:hidden">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {description && (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                )}
              </div>
              {children}
              {footerPrompt && footerLinkText && footerLinkTo && (
                <p className="mt-5 text-center text-sm text-muted-foreground sm:hidden">
                  {footerPrompt}{' '}
                  <Link to={footerLinkTo} className="font-semibold text-primary hover:underline">
                    {footerLinkText}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function AuthCard({ icon: Icon, title, description, children }) {
  return (
    <Card className="rounded-2xl border-muted/80 shadow-sm bg-card">
      <CardHeader className="space-y-2 pb-4">
        {Icon && (
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl border bg-primary/5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
        {description && <CardDescription className="leading-relaxed text-xs">{description}</CardDescription>}
      </CardHeader>
      {children}
    </Card>
  )
}

export function AuthStatusCard({ icon: Icon, tone = 'primary', title, description, children }) {
  const toneClass = {
    primary: 'bg-primary/5 text-primary border-primary/10',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-500/10',
    error: 'bg-destructive/5 text-destructive border-destructive/10',
  }[tone]

  return (
    <Card className="rounded-2xl border-muted/80 shadow-sm bg-card">
      <CardContent className="space-y-6 px-6 py-10 text-center">
        {Icon && (
          <div className="flex justify-center">
            <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl border', toneClass)}>
              <Icon className="h-8 w-8" />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function FormField({ id, label, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={cn('text-xs font-semibold text-foreground', error && 'text-destructive')}>{label}</Label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive mt-1 animate-fade-in">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({
  id,
  label,
  error,
  register,
  show,
  onToggle,
  placeholder = '••••••••',
  autoComplete,
}) {
  return (
    <FormField id={id} label={label} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(
            'h-11 rounded-xl pr-11 transition-all duration-300',
            error ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'
          )}
          {...register}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  )
}

export function SubmitButton({ id, loading, loadingText, children, disabled }) {
  return (
    <Button id={id} type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={disabled || loading}>
      {loading ? loadingText : children}
    </Button>
  )
}
