import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, MapPin, TrendingUp, Clock, ArrowRight } from 'lucide-react'
import { getRoomsApi } from '@/services/roomService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// ── Room Skeleton ────────────────────────────────────────────────────────
function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}

// ── Room Section ─────────────────────────────────────────────────────────
function RoomSection({ title, icon: Icon, rooms, loading, viewAllHref }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
          <Link to={viewAllHref}>
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <RoomCardSkeleton key={i} />)
          : rooms.map((room) => <RoomCard key={room._id} room={room} />)}
      </div>
    </section>
  )
}

// ── Hero Section ─────────────────────────────────────────────────────────
function HeroSection({ onSearch }) {
  const [q, setQ] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(q)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-blue-700 py-20 text-white">
      {/* Background decorative circles */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-16 right-10 h-80 w-80 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-1/4 top-4 h-40 w-40 rounded-full bg-white/5" />

      <div className="container relative mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm backdrop-blur-sm">
          <MapPin className="h-4 w-4" />
          Vĩnh Long • Hệ thống gợi ý phòng trọ thông minh
        </div>

        {/* Title */}
        <h1 className="mb-3 text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
          Tìm phòng trọ
          <br />
          <span className="text-yellow-300">phù hợp nhất</span> cho bạn
        </h1>
        <p className="mb-8 text-lg text-white/80 md:text-xl">
          Hàng trăm phòng trọ chất lượng tại Vĩnh Long,
          <br className="hidden sm:inline" /> được gợi ý thông minh theo vị trí và nhu cầu của bạn.
        </p>

        {/* Quick search */}
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên phòng, địa chỉ, khu vực..."
              className="h-12 pl-11 text-base text-foreground shadow-lg"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 shrink-0 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-semibold">
            Tìm ngay
          </Button>
        </form>

        {/* Stats */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
          <span className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-white">100+</span> phòng đăng mới mỗi tháng
          </span>
          <span className="hidden h-4 w-px bg-white/30 sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-white">AI</span> gợi ý thông minh
          </span>
          <span className="hidden h-4 w-px bg-white/30 sm:block" />
          <span className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-white">360°</span> xem phòng thực tế ảo
          </span>
        </div>
      </div>
    </section>
  )
}

// ── Quick Filter Chips ───────────────────────────────────────────────────
const QUICK_FILTERS = [
  { label: 'Phòng dưới 2 triệu', href: '/search?maxPrice=2000000' },
  { label: 'Có wifi', href: '/search?amenities=["wifi"]' },
  { label: 'Còn trống', href: '/search?isAvailable=true' },
  { label: 'Chung cư mini', href: '/search?roomType=chung_cư_mini' },
  { label: 'Ký túc xá', href: '/search?roomType=ký_túc_xá' },
]

// ── Main Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const [featuredRooms, setFeaturedRooms] = useState([])
  const [recentRooms, setRecentRooms] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    // Phòng nổi bật (nhiều lượt xem)
    getRoomsApi({ sort: 'views', limit: 6, status: 'approved' })
      .then((res) => setFeaturedRooms(res.data?.data?.rooms || []))
      .catch(() => setFeaturedRooms([]))
      .finally(() => setLoadingFeatured(false))

    // Phòng mới đăng
    getRoomsApi({ sort: 'newest', limit: 6, status: 'approved' })
      .then((res) => setRecentRooms(res.data?.data?.rooms || []))
      .catch(() => setRecentRooms([]))
      .finally(() => setLoadingRecent(false))
  }, [])

  const handleHeroSearch = (q) => {
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  return (
    <div>
      {/* Hero */}
      <HeroSection onSearch={handleHeroSearch} />

      {/* Quick filter chips */}
      <div className="border-b bg-background">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Tìm nhanh:</span>
          {QUICK_FILTERS.map((f) => (
            <Link
              key={f.href}
              to={f.href}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content sections */}
      <div className="container mx-auto px-4 py-10 space-y-14">
        <RoomSection
          title="Phòng nổi bật"
          icon={TrendingUp}
          rooms={featuredRooms}
          loading={loadingFeatured}
          viewAllHref="/search?sort=views"
        />

        <RoomSection
          title="Mới đăng gần đây"
          icon={Clock}
          rooms={recentRooms}
          loading={loadingRecent}
          viewAllHref="/search?sort=newest"
        />
      </div>

      {/* CTA Footer Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border-t">
        <div className="container mx-auto px-4 py-10 text-center space-y-4">
          <h2 className="text-2xl font-bold">Bạn là chủ trọ?</h2>
          <p className="text-muted-foreground">
            Đăng tin miễn phí, tiếp cận hàng nghìn sinh viên Vĩnh Long đang tìm phòng.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register">Đăng ký chủ trọ</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/search">Xem phòng hiện có</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
