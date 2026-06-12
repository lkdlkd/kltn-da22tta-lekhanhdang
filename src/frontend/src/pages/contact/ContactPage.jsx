import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Globe, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const FAQS = [
  {
    q: 'Tôi có cần tài khoản để tìm phòng không?',
    a: 'Không cần. Bạn có thể xem danh sách và chi tiết phòng mà không cần đăng ký. Tuy nhiên để nhắn tin, đặt lịch hẹn hoặc nhận gợi ý cá nhân hóa, bạn cần tạo tài khoản miễn phí.',
  },
  {
    q: 'Đăng tin phòng có mất phí không?',
    a: 'Hoàn toàn miễn phí. Chủ trọ có thể đăng ký và đăng tin phòng trọ mà không mất bất kỳ chi phí nào.',
  },
  {
    q: 'Làm sao để liên hệ với chủ trọ?',
    a: 'Sau khi đăng nhập, bạn có thể nhắn tin trực tiếp hoặc đặt lịch hẹn xem phòng ngay trong trang chi tiết của phòng đó.',
  },
  {
    q: 'Thông tin phòng trọ có được kiểm duyệt không?',
    a: 'Có. Mọi tin đăng đều được quản trị viên xem xét và duyệt trước khi hiển thị công khai để đảm bảo thông tin chính xác và phù hợp.',
  },
  {
    q: 'Hệ thống gợi ý hoạt động như thế nào?',
    a: 'Hệ thống phân tích hành vi tìm kiếm, phòng đã xem và tương tác của bạn để đề xuất những phòng phù hợp nhất. Càng sử dụng nhiều, gợi ý càng chính xác.',
  },
  {
    q: 'Tôi có thể so sánh nhiều phòng không?',
    a: 'Có. Bạn có thể thêm nhiều phòng vào danh sách so sánh và xem bảng so sánh chi tiết để lựa chọn dễ dàng hơn.',
  },
]

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const hostname = window.location.hostname || 'sinhvientvu.com'
  const contactItems = [
    {
      icon: MapPin,
      label: 'Khu vực phục vụ',
      value: 'Thành phố Vĩnh Long và các vùng lân cận',
      sub: 'Tập trung hỗ trợ sinh viên khu vực Vĩnh Long',
    },
    {
      icon: Mail,
      label: 'Email hỗ trợ',
      value: `support@${hostname}`,
      href: `mailto:support@${hostname}`,
    },
    {
      icon: Globe,
      label: 'Website',
      value: hostname,
      href: '/',
    },
    {
      icon: Clock,
      label: 'Thời gian phản hồi',
      value: 'Thứ 2 – Thứ 6: 8:00 – 17:00',
      sub: 'Ngoài giờ vui lòng gửi email, chúng tôi phản hồi sớm nhất',
    },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      toast.success('Đã gửi tin nhắn thành công! Chúng tôi sẽ phản hồi sớm nhất có thể.')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    }, 1200)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center sm:mb-12">
        <Badge variant="outline" className="mb-4">
          <MessageSquare className="h-3.5 w-3.5" />
          Liên hệ & Hỗ trợ
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Chúng tôi luôn lắng nghe</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Có thắc mắc về phòng trọ, tài khoản, hoặc muốn góp ý cải thiện nền tảng? Hãy liên hệ — chúng tôi phản hồi nhanh nhất có thể.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* Contact Info */}
        <div className="space-y-4">
          {contactItems.map(({ icon: Icon, label, value, sub, href }) => (
            <div key={label} className="flex items-start gap-4 rounded-xl border bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="mt-0.5 block text-sm font-medium text-primary hover:underline"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                )}
                {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
              </div>
            </div>
          ))}

          {/* Quick links */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-semibold">Bạn cần</p>
            <div className="space-y-2.5">
              <Link to="/search" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                Tìm phòng trọ tại Vĩnh Long
              </Link>
              <Link to="/recommend" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                Nhận gợi ý phòng phù hợp
              </Link>
              <Link to="/about" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
                Tìm hiểu về nền tảng
              </Link>
              <Link to="/register" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Send className="h-3.5 w-3.5 shrink-0 text-primary" />
                Đăng ký chủ trọ miễn phí
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-5 text-lg font-bold">Gửi tin nhắn cho chúng tôi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Họ và tên</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Chủ đề <span className="text-muted-foreground font-normal">(tùy chọn)</span>
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ví dụ: Hỏi về phòng trọ, Báo lỗi hệ thống..."
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nội dung</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mô tả câu hỏi hoặc vấn đề bạn gặp phải..."
                  rows={5}
                  className="rounded-xl"
                  required
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full rounded-xl">
                <Send className="h-4 w-4" />
                {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="mb-2 text-xl font-bold sm:text-2xl">Câu hỏi thường gặp</h2>
        <p className="mb-6 text-sm text-muted-foreground">Những thắc mắc phổ biến từ sinh viên và chủ trọ.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="rounded-xl border bg-card p-4">
              <p className="font-semibold leading-snug">{q}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
