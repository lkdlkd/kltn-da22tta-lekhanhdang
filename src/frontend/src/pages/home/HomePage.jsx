import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Search, MapPin, TrendingUp, Clock, ArrowRight,
  Sparkles, Shield, Zap, Building2, Map, ChevronRight,
} from 'lucide-react'
import { getRoomsApi } from '@/services/roomService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Skeleton ──────────────────────────────────────────────────────────────────
function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const QUICK_FILTERS = [
  { emoji: '💰', label: 'Dưới 2 triệu', href: '/search?maxPrice=2000000' },
  { emoji: '📶', label: 'Có Wifi',       href: '/search?amenities=["wifi"]' },
  { emoji: '✅', label: 'Còn trống',     href: '/search?isAvailable=true' },
  { emoji: '🏢', label: 'Chung cư mini', href: '/search?roomType=chung_cư_mini' },
  { emoji: '🏫', label: 'Ký túc xá',     href: '/search?roomType=ký_túc_xá' },
  { emoji: '❄️', label: 'Có điều hòa',   href: '/search?amenities=["điều_hòa"]' },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Gợi ý AI thông minh',
    desc: 'Thuật toán Hybrid kết hợp nội dung, vị trí và hành vi để gợi ý phòng phù hợp nhất với bạn.',
  },
  {
    icon: Map,
    title: 'Bản đồ tương tác',
    desc: 'Xem toàn bộ phòng trên bản đồ, tính khoảng cách và chỉ đường trực tiếp trong ứng dụng.',
  },
  {
    icon: Shield,
    title: 'Tin đăng xác minh',
    desc: 'Admin kiểm duyệt từng bài đăng. Chỉ phòng hợp lệ mới hiển thị trên hệ thống.',
  },
  {
    icon: Zap,
    title: 'Chat & Đặt lịch nhanh',
    desc: 'Nhắn tin và đặt lịch xem phòng trực tiếp với chủ trọ qua hệ thống nhắn tin thời gian thực.',
  },
]

const STATS = [
  { val: '200+', label: 'Phòng đang đăng' },
  { val: 'AI',   label: 'Gợi ý thông minh' },
  { val: '360°', label: 'Xem thực tế ảo' },
]

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, href }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>
      <Button variant="ghost" size="sm" asChild className="gap-1 text-sm text-primary hover:text-primary">
        <Link to={href}>
          Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all duration-200">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors duration-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── HomePage ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth?.user)
  const [q, setQ] = useState('')
  const [featured, setFeatured] = useState([])
  const [recent, setRecent] = useState([])
  const [loadingF, setLoadingF] = useState(true)
  const [loadingR, setLoadingR] = useState(true)

  useEffect(() => {
    getRoomsApi({ sort: 'views', limit: 6, status: 'approved' })
      .then((r) => setFeatured(r.data?.data?.rooms || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoadingF(false))

    getRoomsApi({ sort: 'newest', limit: 6, status: 'approved' })
      .then((r) => setRecent(r.data?.data?.rooms || []))
      .catch(() => setRecent([]))
      .finally(() => setLoadingR(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20 lg:py-24">

          {/* Pill label */}
          <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1 gap-1.5 text-xs font-medium">
            <MapPin className="h-3 w-3" />
            Vĩnh Long · Gợi ý phòng trọ thông minh
          </Badge>

          {/* Headline */}
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Tìm phòng trọ{' '}
            <span className="text-primary">phù hợp nhất</span>
            {' '}cho bạn
          </h1>

          <p className="mb-8 text-base text-muted-foreground sm:text-lg max-w-xl mx-auto leading-relaxed">
            Hàng trăm phòng trọ chất lượng tại Vĩnh Long, được gợi ý thông minh theo vị trí và nhu cầu của bạn.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all"
          >
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên phòng, địa chỉ, khu vực..."
              className="flex-1 bg-transparent text-sm outline-none py-1.5 placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" className="shrink-0 rounded-lg px-4">
              Tìm ngay
            </Button>
          </form>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {STATS.map(({ val, label }, i) => (
              <>
                <div key={val} className="text-center">
                  <p className="text-2xl font-extrabold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
                {i < STATS.length - 1 && (
                  <Separator orientation="vertical" className="h-8 hidden sm:block" />
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ QUICK FILTER CHIPS ════════════════════════════════════════════ */}
      <div className="border-b bg-background sticky top-14 z-30">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-2.5 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">Tìm nhanh:</span>
            {QUICK_FILTERS.map((f) => (
              <Link
                key={f.href}
                to={f.href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium whitespace-nowrap transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
              >
                <span>{f.emoji}</span>{f.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <div className="mx-auto w-full max-w-7xl px-4 py-10 space-y-14 flex-1">

        {/* Featured rooms */}
        <section>
          <SectionHead icon={TrendingUp} title="Phòng nổi bật" href="/search?sort=views" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingF
              ? Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)
              : featured.length > 0
                ? featured.map((r) => <RoomCard key={r._id} room={r} />)
                : <p className="col-span-3 text-center text-sm text-muted-foreground py-12">Chưa có phòng nổi bật.</p>}
          </div>
        </section>

        {/* Why choose us */}
        <section>
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 rounded-full text-xs">Tính năng</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tại sao chọn PhòngTrọ VL?</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Hệ thống kết hợp AI và bản đồ thực tế để mang đến trải nghiệm tìm phòng tốt nhất.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </section>

        {/* Recent rooms */}
        <section>
          <SectionHead icon={Clock} title="Mới đăng gần đây" href="/search?sort=newest" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingR
              ? Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)
              : recent.length > 0
                ? recent.map((r) => <RoomCard key={r._id} room={r} />)
                : <p className="col-span-3 text-center text-sm text-muted-foreground py-12">Chưa có phòng mới.</p>}
          </div>
        </section>

      </div>

      {/* ═══ CTA BANNER ════════════════════════════════════════════════════ */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center space-y-5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border bg-card text-primary mx-auto shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Bạn là chủ trọ?</h2>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
              Đăng tin miễn phí, tiếp cận hàng nghìn sinh viên Vĩnh Long đang tìm phòng. Quản lý lịch hẹn và chat trực tiếp.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="rounded-xl gap-2 shadow-sm" asChild>
              <Link to="/register">
                <Building2 className="h-4 w-4" />Đăng ký chủ trọ
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link to="/search">Xem phòng hiện có</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}
