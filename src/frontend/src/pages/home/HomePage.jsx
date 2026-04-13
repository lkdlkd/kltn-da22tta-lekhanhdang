import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Search, MapPin, TrendingUp, Clock, ArrowRight,
  Sparkles, Shield, Zap, Star, Building2, Map,
} from 'lucide-react'
import { getRoomsApi } from '@/services/roomService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

// ── Helpers ───────────────────────────────────────────────────────────────
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

const QUICK_FILTERS = [
  { emoji: '💰', label: 'Dưới 2 triệu', href: '/search?maxPrice=2000000' },
  { emoji: '📶', label: 'Có Wifi',       href: '/search?amenities=wifi' },
  { emoji: '✅', label: 'Còn trống',     href: '/search?isAvailable=true' },
  { emoji: '🏢', label: 'Chung cư mini', href: '/search?roomType=chung_cư_mini' },
  { emoji: '🏫', label: 'Ký túc xá',     href: '/search?roomType=ký_túc_xá' },
  { emoji: '🎒', label: 'Gần trường',    href: '/recommend' },
]

const FEATURES = [
  { icon: Sparkles, title: 'Gợi ý AI thông minh',   desc: 'Hệ thống Hybrid AI phân tích nhu cầu và vị trí để gợi ý phòng phù hợp nhất.' },
  { icon: Map,      title: 'Bản đồ tương tác',       desc: 'Xem phòng trên bản đồ, tính khoảng cách, chỉ đường thực tế ngay trong app.' },
  { icon: Shield,   title: 'Phòng được xác minh',    desc: 'Admin kiểm duyệt từng tin đăng. Chỉ phòng hợp lệ mới xuất hiện trên hệ thống.' },
  { icon: Zap,      title: 'Đặt lịch & Chat nhanh',  desc: 'Đặt lịch xem phòng và nhắn tin trực tiếp với chủ trọ qua hệ thống realtime.' },
]

// ── Section header ─────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, href, color = 'text-primary' }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <Button variant="ghost" size="sm" asChild className="gap-1 text-primary text-sm">
        <Link to={href}>Xem tất cả <ArrowRight className="h-4 w-4" /></Link>
      </Button>
    </div>
  )
}

// ── HomePage ───────────────────────────────────────────────────────────────
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
    <div className="flex flex-col">

      {/* ══ HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-0 h-48 w-48 rounded-full bg-blue-400/15 blur-2xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20 lg:py-24">
          {/* Pill badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>Vĩnh Long · Gợi ý phòng trọ thông minh</span>
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Tìm phòng trọ
            <br />
            <span className="text-yellow-300">phù hợp nhất</span> cho bạn
          </h1>
          <p className="mb-8 text-base text-blue-100 sm:text-lg max-w-xl mx-auto">
            Hàng trăm phòng trọ chất lượng tại Vĩnh Long, được gợi ý thông minh theo vị trí và nhu cầu của bạn.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur-sm ring-1 ring-white/20 focus-within:ring-white/40 transition-all"
          >
            <Search className="ml-2 h-5 w-5 shrink-0 text-white/70" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên phòng, địa chỉ, khu vực..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 outline-none py-1.5"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-yellow-900 transition-colors hover:bg-yellow-300 active:scale-95"
            >
              Tìm ngay
            </button>
          </form>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-blue-100">
            {[
              { val: '100+', label: 'Phòng mới/tháng' },
              { val: 'AI', label: 'Gợi ý thông minh' },
              { val: '360°', label: 'Xem thực tế ảo' },
            ].map(({ val, label }) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-white">{val}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ QUICK FILTER CHIPS ══════════════════════════════════════════ */}
      <div className="border-b bg-background sticky top-14 z-30">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-2.5 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">Tìm nhanh:</span>
            {QUICK_FILTERS.map((f) => (
              <Link
                key={f.href}
                to={f.href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <span>{f.emoji}</span>{f.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════ */}
      <div className="mx-auto w-full max-w-7xl px-4 py-10 space-y-14">

        {/* Featured rooms */}
        <section>
          <SectionHead icon={TrendingUp} title="Phòng nổi bật" href="/search?sort=views" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingF
              ? Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)
              : featured.length > 0
                ? featured.map((r) => <RoomCard key={r._id} room={r} />)
                : <p className="col-span-3 text-center text-sm text-muted-foreground py-8">Chưa có phòng nổi bật.</p>}
          </div>
        </section>

        {/* Features grid */}
        <section>
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3 rounded-full">Tính năng nổi bật</Badge>
            <h2 className="text-2xl font-bold sm:text-3xl">Tại sao chọn PhòngTrọ VL?</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Hệ thống kết hợp AI và bản đồ thực tế để mang đến trải nghiệm tìm phòng tốt nhất.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group rounded-2xl border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground leading-5">{desc}</p>
              </div>
            ))}
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
                : <p className="col-span-3 text-center text-sm text-muted-foreground py-8">Chưa có phòng mới.</p>}
          </div>
        </section>
      </div>

      {/* ══ CTA BANNER ══════════════════════════════════════════════════ */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center space-y-5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">Bạn là chủ trọ?</h2>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-6">
            Đăng tin miễn phí, tiếp cận hàng nghìn sinh viên Vĩnh Long đang tìm phòng. Quản lý lịch hẹn và chat trực tiếp với người thuê.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button size="lg" className="rounded-xl gap-2" asChild>
              <Link to="/register"><Building2 className="h-4 w-4" />Đăng ký chủ trọ</Link>
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
