import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ShieldBan, ShieldCheck } from 'lucide-react'
import dayjs from 'dayjs'
import { adminGetUsersApi, adminBanUserApi, adminUnbanUserApi } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const ROLE_BADGE = {
  student: { label: 'Sinh viên', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  landlord: { label: 'Chủ trọ', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  admin: { label: 'Admin', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await adminGetUsersApi({ role: roleFilter || undefined, limit: 50 })
      setUsers(res.data?.data?.users || [])
    } catch { toast.error('Không thể tải danh sách người dùng') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [roleFilter])

  const handleBan = async (id, isBanned) => {
    setActionLoading(id)
    try {
      isBanned ? await adminUnbanUserApi(id) : await adminBanUserApi(id)
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isBanned: !isBanned } : u))
      toast.success(isBanned ? 'Đã mở khoá tài khoản' : 'Đã khoá tài khoản')
    } catch { toast.error('Lỗi') }
    finally { setActionLoading('') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Quản lý người dùng</h1>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="student">Sinh viên</option>
          <option value="landlord">Chủ trọ</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Người dùng</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-center">Vai trò</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Ngày đăng ký</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 mx-auto" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-24 mx-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Không có người dùng nào</td></tr>
            ) : (
              users.map((user) => {
                const rb = ROLE_BADGE[user.role] || ROLE_BADGE.student
                return (
                  <tr key={user._id} className={`hover:bg-muted/30 transition-colors ${user.isBanned ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {(user.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          {user.isBanned && <span className="text-xs text-red-500">Đã khoá</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${rb.className}`}>{rb.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-center text-muted-foreground text-xs">
                      {dayjs(user.createdAt).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role !== 'admin' && (
                        <Button
                          variant={user.isBanned ? 'outline' : 'ghost'}
                          size="sm"
                          className={user.isBanned ? '' : 'text-red-500 hover:text-red-600'}
                          disabled={actionLoading === user._id}
                          onClick={() => handleBan(user._id, user.isBanned)}
                        >
                          {user.isBanned
                            ? <><ShieldCheck className="h-3.5 w-3.5" /> Mở khoá</>
                            : <><ShieldBan className="h-3.5 w-3.5" /> Khoá</>}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
