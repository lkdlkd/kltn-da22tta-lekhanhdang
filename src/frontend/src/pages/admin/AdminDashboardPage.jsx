import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Users, Clock, Star, TrendingUp } from 'lucide-react'
import { adminGetStatsApi } from '@/services/adminService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <Card className={`border-l-4 ${colorClass}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value ?? '—'}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetStatsApi()
      .then((res) => setStats(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Tổng quan hệ thống phòng trọ</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="flex items-center justify-between p-4">
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-12" /></div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </CardContent></Card>
          ))
        ) : (
          <>
            <StatCard label="Tổng phòng" value={stats?.totalRooms} icon={Home}
              colorClass="border-l-blue-500" bgClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard label="Chờ duyệt" value={stats?.pendingRooms} icon={Clock}
              colorClass="border-l-yellow-500" bgClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
            <StatCard label="Người dùng" value={stats?.totalUsers} icon={Users}
              colorClass="border-l-violet-500" bgClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
            <StatCard label="Đánh giá chờ duyệt" value={stats?.pendingReviews} icon={Star}
              colorClass="border-l-emerald-500" bgClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          </>
        )}
      </div>

      {/* Top rooms */}
      {stats?.topRooms?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Phòng nhiều lượt xem nhất</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topRooms.map((room, idx) => (
                <div key={room._id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{idx + 1}</span>
                  {room.images?.[0] && <img src={room.images[0]} alt="" className="h-10 w-14 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <Link to={`/rooms/${room.slug}`} className="text-sm font-medium hover:underline line-clamp-1">{room.title}</Link>
                    <p className="text-xs text-muted-foreground">{room.viewCount} lượt xem</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
