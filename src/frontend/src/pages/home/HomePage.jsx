import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Map,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wifi,
} from 'lucide-react'
import { getRoomsApi } from '@/services/roomService'
import { RoomCard, RoomCardSkeleton } from '@/components/rooms/RoomCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import heroImage from '@/assets/home-hero-student-housing.jpg'

const CATEGORY_LINKS = [
  { icon: BedDouble, label: 'Phòng trọ', href: '/search?roomType=phòng_trọ' },
  { icon: Building2, label: 'Chung cư mini', href: '/search?roomType=chung_cư_mini' },
  { icon: Home, label: 'Ký túc xá', href: '/search?roomType=ký_túc_xá' },
  { icon: Wifi, label: 'Có Wifi', href: '/search?amenities=["wifi"]' },
  { icon: CheckCircle2, label: 'Còn trống', href: '/search?isAvailable=true' },
  { icon: Map, label: 'Xem bản đồ', href: '/search' },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Gợi ý đúng nhu cầu',
    desc: 'Lọc theo giá, khu vực, tiện ích và nhận gợi ý phù hợp hơn khi đăng nhập.',
  },
  {
    icon: ShieldCheck,
    title: 'Thông tin dễ kiểm tra',
    desc: 'Ảnh, giá, diện tích, trạng thái và địa chỉ được trình bày rõ để so sánh nhanh.',
  },
  {
    icon: MessageCircle,
    title: 'Liên hệ thuận tiện',
    desc: 'Nhắn tin với chủ trọ, đặt lịch xem phòng và theo dõi lịch hẹn trong một nơi.',
  },
]

function SectionHeader({ icon: Icon, title, desc, href, action = 'Xem tất cả' }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-card text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        </div>
        {desc && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{desc}</p>}
      </div>
      <Button variant="ghost" size="sm" asChild className="w-fit rounded-lg text-primary hover:text-primary">
        <Link to={href}>
          {action}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function CategoryGrid() {
  return (
    <section className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_LINKS.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              to={href}
              className="group flex min-h-24 flex-col justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 sm:p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-3 text-sm font-semibold leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-lg border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
  )
}

function RoomGrid({ loading, rooms, emptyText }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {loading
        ? Array.from({ length: 6 }).map((_, index) => <RoomCardSkeleton key={index} />)
        : rooms.length > 0
          ? rooms.map((room) => <RoomCard key={room._id} room={room} />)
          : <p className="col-span-full rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">{emptyText}</p>}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth?.user)
  const [q, setQ] = useState('')
  const [area, setArea] = useState('')
  const [featured, setFeatured] = useState([])
  const [recent, setRecent] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    getRoomsApi({ sort: 'views', limit: 6, status: 'approved' })
      .then((res) => setFeatured(res.data?.data?.rooms || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoadingFeatured(false))

    getRoomsApi({ sort: 'newest', limit: 6, status: 'approved' })
      .then((res) => setRecent(res.data?.data?.rooms || []))
      .catch(() => setRecent([]))
      .finally(() => setLoadingRecent(false))
  }, [])

  const handleSearch = (event) => {
    event.preventDefault()
    const keyword = [q.trim(), area.trim()].filter(Boolean).join(' ')
    const params = new URLSearchParams()
    if (keyword) params.set('q', keyword)
    navigate(params.toString() ? `/search?${params.toString()}` : '/search')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <section className="relative overflow-hidden border-b bg-muted">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Không gian phòng trọ sinh viên" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>

        <div className="relative mx-auto flex min-h-[500px] max-w-7xl flex-col justify-center px-4 py-12 text-white sm:px-6 lg:min-h-[620px] lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-4 border-white/25 bg-white/15 text-white hover:bg-white/15">
              <MapPin className="h-3.5 w-3.5" />
              Vĩnh Long · Phòng trọ sinh viên
            </Badge>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Tìm phòng trọ phù hợp, xem thông tin rõ ràng
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              Khám phá phòng trọ, chung cư mini và ký túc xá quanh Vĩnh Long. So sánh giá, tiện ích, vị trí và liên hệ chủ trọ nhanh hơn.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="rounded-lg">
                <Link to="/search">
                  Khám phá phòng
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="rounded-lg bg-white text-slate-950 hover:bg-white/90 hover:text-slate-950 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90 dark:hover:text-slate-950"
              >
                <Link to={user ? '/recommend' : '/login'}>
                  Gợi ý cho bạn
                  <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:-mt-20 lg:px-8 lg:pb-0">
          <form onSubmit={handleSearch} className="grid gap-3 rounded-xl border bg-background p-3 shadow-xl sm:p-4 md:grid-cols-[1.3fr_1fr_auto]">
            <label className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-muted-foreground">Bạn muốn tìm gì?</span>
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Tên phòng, loại phòng, tiện ích..."
                  className="mt-1 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-muted-foreground">Khu vực</span>
                <input
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  placeholder="Phường, đường, gần trường..."
                  className="mt-1 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>
            <Button type="submit" size="lg" className="min-h-12 rounded-lg px-8 md:min-h-14">
              Tìm kiếm
            </Button>
          </form>
        </div>
      </section>

      <CategoryGrid />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:space-y-14 lg:px-8">
        <section>
          <SectionHeader
            icon={TrendingUp}
            title="Phòng nổi bật"
            desc="Các tin được quan tâm nhiều, phù hợp để bạn bắt đầu so sánh nhanh."
            href="/search?sort=views"
          />
          <RoomGrid loading={loadingFeatured} rooms={featured} emptyText="Chưa có phòng nổi bật." />
        </section>

        <section className="rounded-xl border bg-muted/25 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-2xl">
            <Badge variant="outline" className="mb-3">Trải nghiệm tìm phòng</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tìm đúng phòng, liên hệ nhanh hơn</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Website tập trung vào các thao tác người thuê và chủ trọ cần dùng mỗi ngày, từ tìm kiếm đến đặt lịch xem phòng.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
        </section>

        <section>
          <SectionHeader
            icon={Clock}
            title="Mới đăng gần đây"
            desc="Cập nhật các phòng mới để bạn không bỏ lỡ lựa chọn phù hợp."
            href="/search?sort=newest"
          />
          <RoomGrid loading={loadingRecent} rooms={recent} emptyText="Chưa có phòng mới." />
        </section>
      </main>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8 lg:py-12">
          <div>
            <Badge variant="secondary" className="mb-3">
              <CalendarCheck className="h-3.5 w-3.5" />
              Dành cho chủ trọ
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Có phòng cần cho thuê?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Đăng tin, quản lý phòng, lịch hẹn và trao đổi với sinh viên đang tìm phòng quanh Vĩnh Long.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button size="lg" asChild className="rounded-lg">
              <Link to="/register">
                <Building2 className="h-4 w-4" />
                Đăng ký chủ trọ
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-lg">
              <Link to="/search">Xem phòng hiện có</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
