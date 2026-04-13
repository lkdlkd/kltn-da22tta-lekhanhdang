import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Home, Users, Clock, Star, TrendingUp, Eye,
  ArrowRight, Activity, CheckCircle, Flag,
  BarChart2, AlertCircle,
} from 'lucide-react'
import { adminGetStatsApi } from '@/services/adminService'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

/* ── Stat config ─────────────────────────────────────────────────────────── */
const STAT_CONFIGS = [
  {
    key: 'totalRooms',
    label: 'Tổng phòng',
    icon: Home,
    iconCls: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    href: '/admin/rooms',
    desc: 'Tổng số phòng trong hệ thống',
  },
  {
    key: 'pendingRooms',
    label: 'Chờ duyệt',
    icon: Clock,
    iconCls: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    href: '/admin/rooms',
    urgent: true,
    desc: 'Phòng đang chờ admin duyệt',
  },
  {
    key: 'totalUsers',
    label: 'Người dùng',
    icon: Users,
    iconCls: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-900/20',
    href: '/admin/users',
    desc: 'Tổng tài khoản đã đăng ký',
  },
  {
    key: 'pendingReviews',
    label: 'Đánh giá chờ',
    icon: Star,
    iconCls: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    href: '/admin/reviews',
    desc: 'Đánh giá chờ kiểm duyệt',
  },
]

/* ── StatCard ─────────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, iconCls, iconBg, href, urgent, desc, loading }) {
  return (
    <Link to={href} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className={`h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 ${urgent && value > 0 ? 'border-amber-300 dark:border-amber-700' : ''}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
              <div className="mt-2">
                {loading
                  ? <Skeleton className="h-9 w-16" />
                  : <p className="text-3xl font-extrabold tabular-nums tracking-tight">
                      {value?.toLocaleString() ?? '—'}
                    </p>}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground break-words">{desc}</p>
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconCls}`} />
            </div>
          </div>
          {urgent && value > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Cần xử lý ngay</span>
            </div>
          )}
          {!(urgent && value > 0) && (
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <span>Xem chi tiết</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

/* ── Monthly chart row ───────────────────────────────────────────────────── */
function MonthlyBar({ month, year, count, max }) {
  const pct = max > 0 ? Math.max((count / max) * 100, 4) : 4
  const label = `T${month}/${String(year).slice(2)}`
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{count}</span>
      <div className="w-7 rounded-md bg-muted overflow-hidden flex items-end" style={{ height: 64 }}>
        <div className="w-full rounded-md bg-primary/70 transition-all duration-500" style={{ height: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

/* ── Quick action ────────────────────────────────────────────────────────── */
function QuickLink({ to, icon: Icon, label, desc, badge }) {
  return (
    <Link to={to}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:bg-muted/30 transition-all group">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-snug">{label}</p>
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">{badge}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  )
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetStatsApi()
      .then(res => setStats(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const monthlyMax = stats?.monthlyData?.length
    ? Math.max(...stats.monthlyData.map(m => m.count))
    : 0

  return (
    <div className="space-y-6">

      {/* ── Page header ─── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tổng quan hệ thống phòng trọ sinh viên</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card text-muted-foreground">
          <Activity className="h-4 w-4" />
        </div>
      </div>

      {/* ── Stat cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CONFIGS.map(cfg => (
          <StatCard key={cfg.key} {...cfg} value={stats?.[cfg.key]} loading={loading} />
        ))}
      </div>

      {/* ── Bottom section ─── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Top rooms (2/3) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b space-y-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Phòng xem nhiều nhất
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                <Link to="/admin/rooms">Tất cả <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0">
                      <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                      <Skeleton className="h-11 w-18 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-4 w-14 shrink-0" />
                    </div>
                  ))
                : (stats?.topRooms?.length === 0 || !stats?.topRooms)
                  ? (
                    <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
                      <Home className="h-8 w-8 opacity-20" />
                      <p className="text-sm">Chưa có dữ liệu</p>
                    </div>
                  )
                  : stats.topRooms.map((room, idx) => (
                      <div key={room._id}
                        className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors group">
                        {/* Rank badge */}
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                          idx === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800' :
                          idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </span>

                        {/* Thumbnail */}
                        {room.images?.[0]
                          ? <img src={room.images[0]} alt="" className="h-11 w-[4.5rem] rounded-lg object-cover shrink-0 border" />
                          : <div className="flex h-11 w-[4.5rem] rounded-lg bg-muted items-center justify-center shrink-0 border"><Home className="h-4 w-4 opacity-30" /></div>}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/rooms/${room.slug}`} target="_blank"
                            className="text-sm font-medium hover:underline break-words group-hover:text-primary transition-colors">
                            {room.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            {room.address?.district && <span>{room.address.district}</span>}
                            {room.price && (
                              <>
                                <Separator orientation="vertical" className="h-3" />
                                <span className="font-medium text-foreground">
                                  {new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(room.price)}đ/th
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Views */}
                        <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="font-semibold tabular-nums">{room.viewCount?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-5">

          {/* Quick actions */}
          <Card>
            <CardHeader className="px-5 py-4 border-b space-y-0">
              <CardTitle className="text-sm font-semibold">Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <QuickLink to="/admin/rooms" icon={CheckCircle} label="Duyệt phòng" desc="Xem danh sách chờ duyệt" badge={stats?.pendingRooms} />
              <QuickLink to="/admin/reviews" icon={Star} label="Duyệt đánh giá" desc="Kiểm duyệt review của người dùng" badge={stats?.pendingReviews} />
              <QuickLink to="/admin/reports" icon={Flag} label="Báo cáo vi phạm" desc="Xem và xử lý tố cáo" />
              <QuickLink to="/admin/users" icon={Users} label="Người dùng" desc="Quản lý tài khoản" />
            </CardContent>
          </Card>

          {/* Monthly chart */}
          {(loading || (stats?.monthlyData?.length > 0)) && (
            <Card>
              <CardHeader className="px-5 py-4 border-b space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Phòng đăng theo tháng
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-4">
                {loading
                  ? <div className="flex items-end gap-1.5 h-20">
                      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${40 + Math.random() * 40}%` }} />)}
                    </div>
                  : (
                    <div className="flex items-end justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {stats.monthlyData.slice(-8).map((m, i) => (
                        <MonthlyBar key={i} month={m._id.month} year={m._id.year} count={m.count} max={monthlyMax} />
                      ))}
                    </div>
                  )}
                <p className="text-xs text-muted-foreground text-center mt-3">12 tháng gần nhất</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
