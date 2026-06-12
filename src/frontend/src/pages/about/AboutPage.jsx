import { Link } from 'react-router-dom'
import {
  BedDouble,
  CalendarCheck,
  CheckCircle2,
  Compass,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wifi,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const FEATURES = [
  {
    icon: Search,
    title: 'Tìm kiếm nhanh chóng',
    desc: 'Lọc phòng theo giá, khu vực, diện tích, loại phòng và nhiều tiêu chí khác chỉ trong vài giây.',
  },
  {
    icon: Compass,
    title: 'Gợi ý phù hợp với bạn',
    desc: 'Hệ thống phân tích lịch sử tìm kiếm và tương tác để đề xuất phòng phù hợp nhất với nhu cầu cá nhân.',
  },
  {
    icon: ShieldCheck,
    title: 'Thông tin minh bạch',
    desc: 'Mỗi tin đăng đều có ảnh thực tế, giá niêm yết rõ ràng, diện tích và trạng thái phòng được kiểm duyệt.',
  },
  {
    icon: MessageCircle,
    title: 'Nhắn tin & Đặt lịch',
    desc: 'Liên hệ trực tiếp với chủ trọ, đặt lịch hẹn xem phòng và quản lý lịch hẹn ngay trong nền tảng.',
  },
  {
    icon: Star,
    title: 'Đánh giá & Bình luận',
    desc: 'Đọc đánh giá thực từ người thuê trước, giúp bạn đưa ra quyết định chính xác và tự tin hơn.',
  },
  {
    icon: Users,
    title: 'Cộng đồng sinh viên',
    desc: 'Kết nối hàng nghìn sinh viên và chủ trọ tại Vĩnh Long trong một nền tảng duy nhất.',
  },
]

const STATS = [
  { value: '3+', label: 'Loại phòng', sub: 'Phòng trọ · Chung cư mini · Ký túc xá' },
  { value: '100%', label: 'Kiểm duyệt', sub: 'Tin đăng được duyệt trước khi hiển thị' },
  { value: '0đ', label: 'Phí đăng tin', sub: 'Hoàn toàn miễn phí cho chủ trọ' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tìm kiếm & Lọc',
    desc: 'Nhập khu vực, mức giá hoặc loại phòng bạn muốn. Hệ thống hiển thị kết quả phù hợp ngay lập tức.',
  },
  {
    step: '02',
    title: 'Xem chi tiết & So sánh',
    desc: 'Xem ảnh, giá, tiện ích và địa chỉ của từng phòng. Thêm vào danh sách so sánh để chọn lựa dễ hơn.',
  },
  {
    step: '03',
    title: 'Liên hệ & Đặt lịch',
    desc: 'Nhắn tin hoặc đặt lịch hẹn xem phòng trực tiếp với chủ trọ. Theo dõi lịch hẹn trong tài khoản của bạn.',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-10 text-center sm:mb-12">
        <Badge variant="outline" className="mb-4">
          <MapPin className="h-3.5 w-3.5" />
          Vĩnh Long · Phòng trọ sinh viên
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Nền tảng tìm trọ & gợi ý{' '}
          <span className="text-primary">thông minh</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Phòng Trọ Sinh Viên giúp sinh viên tìm kiếm phòng trọ phù hợp tại Vĩnh Long một cách nhanh chóng, minh bạch và tiện lợi — với hệ thống gợi ý cá nhân hóa thông minh.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="rounded-xl">
            <Link to="/search">Tìm phòng ngay</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/recommend">Nhận gợi ý</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 text-center">
            <p className="text-3xl font-extrabold text-primary">{s.value}</p>
            <p className="mt-1 font-semibold">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="mb-12">
        <h2 className="mb-2 text-xl font-bold sm:text-2xl">Tại sao chọn Phòng Trọ Sinh Viên?</h2>
        <p className="mb-6 text-sm text-muted-foreground">Chúng tôi tập trung vào những gì sinh viên thực sự cần khi tìm phòng.</p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="mb-2 text-xl font-bold sm:text-2xl">Tìm phòng chỉ trong 3 bước</h2>
        <p className="mb-6 text-sm text-muted-foreground">Đơn giản, nhanh chóng, không phức tạp.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="rounded-xl border bg-card p-5">
              <span className="text-3xl font-extrabold text-primary/20">{step}</span>
              <h3 className="mt-2 font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* For whom */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
              <BedDouble className="h-5 w-5" />
            </div>
            <h3 className="font-bold">Dành cho sinh viên</h3>
            <ul className="mt-3 space-y-2">
              {[
                'Tìm phòng nhanh theo khu vực, giá, tiện ích',
                'Nhận gợi ý phòng phù hợp với nhu cầu',
                'So sánh nhiều phòng cùng lúc',
                'Đặt lịch hẹn xem phòng dễ dàng',
                'Lưu phòng yêu thích để theo dõi',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-4 rounded-xl">
              <Link to="/search">Tìm phòng ngay</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold">Dành cho chủ trọ</h3>
            <ul className="mt-3 space-y-2">
              {[
                'Đăng tin phòng trọ hoàn toàn miễn phí',
                'Quản lý phòng, giá và trạng thái dễ dàng',
                'Tiếp nhận và xác nhận lịch hẹn xem phòng',
                'Nhắn tin trực tiếp với sinh viên quan tâm',
                'Theo dõi thống kê lượt xem qua dashboard',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-4 rounded-xl">
              <Link to="/register">Đăng ký chủ trọ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <h3 className="text-lg font-bold">Bắt đầu tìm phòng ngay hôm nay</h3>
          <p className="mt-1 text-sm text-muted-foreground">Hàng trăm phòng trọ đang chờ bạn khám phá tại Vĩnh Long.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
          <Button asChild className="rounded-xl">
            <Link to="/search">
              <Search className="h-4 w-4" />
              Tìm phòng
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/contact">Liên hệ</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
