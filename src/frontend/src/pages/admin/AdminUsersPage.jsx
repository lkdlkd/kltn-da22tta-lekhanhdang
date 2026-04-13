import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ShieldBan, ShieldCheck, Users, RefreshCw,
  Search, ChevronLeft, ChevronRight, Mail, Phone,
} from 'lucide-react'
import dayjs from 'dayjs'
import { adminGetUsersApi, adminBanUserApi, adminUnbanUserApi } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const ROLE_CFG = {
  student:  {
    label: 'Sinh viên',
    badgeCls: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    avatarCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  landlord: {
    label: 'Chủ trọ',
    badgeCls: 'border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
    avatarCls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  admin: {
    label: 'Admin',
    badgeCls: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    avatarCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

const ROLE_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'student', label: 'Sinh viên' },
  { value: 'landlord', label: 'Chủ trọ' },
  { value: 'admin', label: 'Admin' },
]

const BAN_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'false', label: 'Hoạt động' },
  { value: 'true', label: 'Đã khoá' },
]

function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t">
      <p className="text-xs text-muted-foreground">{total} tài khoản · Trang {page}/{totalPages}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2
          if (p < 1 || p > totalPages) return null
          return (
            <Button key={p} size="icon" className="h-7 w-7 text-xs"
              variant={p === page ? 'default' : 'outline'} onClick={() => onChange(p)}>{p}
            </Button>
          )
        })}
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [roleFilter, setRoleFilter]   = useState('')
  const [banFilter, setBanFilter]     = useState('')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [pagination, setPagination]   = useState({ total: 0, totalPages: 1 })
  const [actionLoading, setActionLoading] = useState('')
  const LIMIT = 20

  const fetchUsers = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (roleFilter) params.role = roleFilter
      if (banFilter !== '') params.isBanned = banFilter
      const res = await adminGetUsersApi(params)
      setUsers(res.data?.data?.users || [])
      setPagination(res.data?.data?.pagination || { total: 0, totalPages: 1 })
    } catch { toast.error('Không thể tải danh sách người dùng') }
    finally { setLoading(false) }
  }, [roleFilter, banFilter, page])

  useEffect(() => { setPage(1); fetchUsers(1) }, [roleFilter, banFilter])
  useEffect(() => { fetchUsers(page) }, [page])

  const handleBan = async (id, isBanned) => {
    setActionLoading(id)
    try {
      isBanned ? await adminUnbanUserApi(id) : await adminBanUserApi(id)
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: !isBanned } : u))
      toast.success(isBanned ? 'Đã mở khoá ✅' : 'Đã khoá tài khoản 🔒')
    } catch { toast.error('Lỗi thực hiện thao tác') }
    finally { setActionLoading('') }
  }

  const displayed = search.trim()
    ? users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
      )
    : users

  const bannedCount = users.filter(u => u.isBanned).length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold">Quản lý người dùng</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pagination.total} tài khoản
            {bannedCount > 0 && <span className="text-red-500 font-medium"> · {bannedCount} đang khoá</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tên, email, SĐT..."
              className="h-9 pl-8 w-48" />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fetchUsers(page)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role tabs */}
        <div className="flex gap-0 border-b">
          {ROLE_TABS.map(tab => (
            <button key={tab.value} onClick={() => setRoleFilter(tab.value)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                roleFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {tab.label}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Ban filter pills */}
        <div className="flex items-center gap-1.5">
          {BAN_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setBanFilter(opt.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                banFilter === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Người dùng', 'Liên hệ', 'Vai trò', 'Tham gia', 'Xác minh', 'Thao tác'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full shrink-0" /><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div></div></td>
                      <td className="px-5 py-3"><div className="space-y-1.5"><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-24" /></div></td>
                      <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                : displayed.length === 0
                  ? (
                    <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Không có người dùng nào</p>
                    </td></tr>
                  )
                  : displayed.map(user => {
                      const rc = ROLE_CFG[user.role] || ROLE_CFG.student
                      return (
                        <tr key={user._id} className={cn('hover:bg-muted/20 transition-colors', user.isBanned && 'opacity-55')}>
                          {/* User */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold overflow-hidden border', rc.avatarCls)}>
                                {user.avatar
                                  ? <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                                  : (user.name || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-snug break-words">{user.name}</p>
                                {user.isBanned && (
                                  <Badge variant="outline" className="mt-0.5 h-4 px-1.5 text-[10px] border-red-200 bg-red-50 text-red-600">
                                    Đã khoá
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Contact */}
                          <td className="px-5 py-3 text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="break-all">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 shrink-0" />{user.phone}
                              </div>
                            )}
                          </td>
                          {/* Role */}
                          <td className="px-5 py-3">
                            <Badge variant="outline" className={rc.badgeCls}>{rc.label}</Badge>
                          </td>
                          {/* Join */}
                          <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {dayjs(user.createdAt).format('DD/MM/YYYY')}
                          </td>
                          {/* Verified */}
                          <td className="px-5 py-3">
                            {user.isEmailVerified
                              ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] h-5">✓ Đã xác minh</Badge>
                              : <span className="text-xs text-muted-foreground">Chưa xác minh</span>}
                          </td>
                          {/* Action */}
                          <td className="px-5 py-3 text-right">
                            {user.role !== 'admin' && (
                              <Button
                                variant={user.isBanned ? 'outline' : 'ghost'}
                                size="sm"
                                className={cn('h-8 gap-1.5 text-xs', !user.isBanned && 'text-red-500 hover:bg-red-50 hover:text-red-600')}
                                disabled={actionLoading === user._id}
                                onClick={() => handleBan(user._id, user.isBanned)}
                              >
                                {user.isBanned
                                  ? <><ShieldCheck className="h-3.5 w-3.5" />Mở khoá</>
                                  : <><ShieldBan className="h-3.5 w-3.5" />Khoá</>}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
      </Card>
    </div>
  )
}
