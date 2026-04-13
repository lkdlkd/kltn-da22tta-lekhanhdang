import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Camera, KeyRound, User, Heart, AlertCircle,
  Shield, CheckCircle2, Mail, Phone, MapPin,
  Sparkles, Save, Eye, EyeOff, Building2,
} from 'lucide-react'
import { getProfileApi, updateProfileApi, changePasswordApi } from '@/services/userService'
import { getFavoritesApi } from '@/services/favoriteService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { RoomCard } from '@/components/rooms/RoomCard'
import { cn } from '@/lib/utils'

const ROLE_LABEL  = { student: 'Sinh viên', landlord: 'Chủ trọ', admin: 'Quản trị viên' }
const ROLE_COLOR  = { student: 'bg-blue-50 text-blue-700 border-blue-200', landlord: 'bg-amber-50 text-amber-700 border-amber-200', admin: 'bg-red-50 text-red-700 border-red-200' }
const ROLE_ICON   = { student: User, landlord: Building2, admin: Shield }

/* ── AvatarUpload ─────────────────────────────────────────────────────────── */
function AvatarUpload({ avatarUrl, name, onFile }) {
  const ref = useRef(null)
  const [preview, setPreview] = useState(avatarUrl || null)
  useEffect(() => setPreview(avatarUrl || null), [avatarUrl])

  const handleChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Ảnh tối đa 5MB'); return }
    setPreview(URL.createObjectURL(f))
    onFile(f)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-background shadow-lg">
          {preview
            ? <img src={preview} alt="avatar" className="h-full w-full object-cover" />
            : <span className="text-3xl font-bold text-primary">{(name || '?')[0].toUpperCase()}</span>}
        </div>
        <button type="button" onClick={() => ref.current?.click()}
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all hover:scale-110">
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>
      <p className="text-[11px] text-muted-foreground">JPG, PNG · Tối đa 5MB</p>
    </div>
  )
}

/* ── FieldGroup ────────────────────────────────────────────────────────────── */
function FieldGroup({ label, icon: Icon, id, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ── Loading Skeleton ─────────────────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-52" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-24 w-24 rounded-full mx-auto" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  )
}

/* ── ProfilePage ──────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const authUser = useSelector(s => s.auth?.user)
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [form, setForm]         = useState({ name: '', phone: '', preferences: { maxPrice: '', minArea: '', district: '' } })
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw]     = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving]     = useState(false)
  const [favRooms, setFavRooms] = useState([])
  const [loadingFavs, setLoadingFavs] = useState(false)

  useEffect(() => {
    getProfileApi()
      .then(res => {
        const u = res.data?.data?.user
        if (!u) { setError('Không tải được hồ sơ'); return }
        setUser(u)
        setForm({
          name: u.name || '', phone: u.phone || '',
          preferences: { maxPrice: u.preferences?.maxPrice || '', minArea: u.preferences?.minArea || '', district: u.preferences?.district || '' },
        })
      })
      .catch(err => {
        const msg = err.response?.status === 401 ? 'Phiên đăng nhập đã hết hạn.' : 'Không thể tải hồ sơ.'
        setError(msg); toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const loadFavs = () => {
    if (loadingFavs) return
    setLoadingFavs(true)
    getFavoritesApi()
      .then(res => setFavRooms(res.data?.data?.rooms || []))
      .catch(() => toast.error('Không thể tải yêu thích'))
      .finally(() => setLoadingFavs(false))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Tên không được để trống'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('phone', form.phone.trim())
      fd.append('preferences', JSON.stringify({
        maxPrice: Number(form.preferences.maxPrice) || null,
        minArea:  Number(form.preferences.minArea) || null,
        district: form.preferences.district.trim() || null,
      }))
      if (avatarFile) fd.append('avatar', avatarFile)
      const res = await updateProfileApi(fd)
      const updated = res.data?.data?.user
      if (updated) {
        setUser(updated)
        setForm({ name: updated.name || '', phone: updated.phone || '', preferences: { maxPrice: updated.preferences?.maxPrice || '', minArea: updated.preferences?.minArea || '', district: updated.preferences?.district || '' } })
      }
      setAvatarFile(null)
      toast.success('Cập nhật hồ sơ thành công!')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật') }
    finally { setSaving(false) }
  }

  const handleChangePw = async (e) => {
    e.preventDefault()
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('Vui lòng điền đầy đủ'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Mật khẩu mới không khớp'); return }
    if (pwForm.newPassword.length < 6) { toast.error('Mật khẩu ít nhất 6 ký tự'); return }
    setSaving(true)
    try {
      await changePasswordApi({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Đổi mật khẩu thành công!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không đúng') }
    finally { setSaving(false) }
  }

  if (loading) return <ProfileSkeleton />

  if (error || !user) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="font-semibold">Không thể tải hồ sơ</h2>
      <p className="text-sm text-muted-foreground max-w-xs">{error || 'Phiên đăng nhập có thể đã hết hạn.'}</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
        <Button asChild><Link to="/login">Đăng nhập lại</Link></Button>
      </div>
    </div>
  )

  const RoleIcon = ROLE_ICON[user.role] || User

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

      {/* ── Profile hero card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-primary/5" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-background shadow-md">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              : <span className="text-2xl font-bold text-primary">{(user.name || '?')[0].toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', ROLE_COLOR[user.role] || '')}>
                <RoleIcon className="h-3 w-3" />
                {ROLE_LABEL[user.role] || user.role}
              </span>
              {user.isEmailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />Đã xác minh
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="info" onValueChange={v => v === 'favorites' && loadFavs()}>
        <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl">
          <TabsTrigger value="info" className="rounded-lg gap-1.5 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5" />Thông tin
          </TabsTrigger>
          <TabsTrigger value="favorites" className="rounded-lg gap-1.5 text-xs sm:text-sm">
            <Heart className="h-3.5 w-3.5" />Yêu thích
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-1.5 text-xs sm:text-sm">
            <KeyRound className="h-3.5 w-3.5" />Bảo mật
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Thông tin ── */}
        <TabsContent value="info" className="mt-4">
          <form onSubmit={handleSave} className="space-y-6">

            {/* Avatar */}
            <div className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row items-center gap-5">
              <AvatarUpload avatarUrl={user.avatar} name={user.name} onFile={setAvatarFile} />
              <div className="text-center sm:text-left">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Thông tin cơ bản */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-sm">Thông tin cơ bản</h2>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldGroup label="Họ và tên" icon={User} id="pf-name">
                  <Input id="pf-name" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nguyễn Văn A" className="rounded-lg" />
                </FieldGroup>
                <FieldGroup label="Số điện thoại" icon={Phone} id="pf-phone">
                  <Input id="pf-phone" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0901 234 567" className="rounded-lg" />
                </FieldGroup>
              </div>
              <FieldGroup label="Email" icon={Mail} id="pf-email" hint="Email không thể thay đổi">
                <Input id="pf-email" value={user.email} disabled className="rounded-lg opacity-60 cursor-not-allowed" />
              </FieldGroup>
            </div>

            {/* Sở thích AI */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Sở thích tìm phòng</h2>
                  <p className="text-xs text-muted-foreground">Giúp AI gợi ý phòng phù hợp hơn</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <FieldGroup label="Giá tối đa (VNĐ)" id="pf-maxprice">
                  <Input id="pf-maxprice" type="number" min={0} placeholder="3,000,000"
                    value={form.preferences.maxPrice}
                    onChange={e => setForm(p => ({ ...p, preferences: { ...p.preferences, maxPrice: e.target.value } }))}
                    className="rounded-lg" />
                </FieldGroup>
                <FieldGroup label="Diện tích tối thiểu (m²)" id="pf-minarea">
                  <Input id="pf-minarea" type="number" min={0} placeholder="15"
                    value={form.preferences.minArea}
                    onChange={e => setForm(p => ({ ...p, preferences: { ...p.preferences, minArea: e.target.value } }))}
                    className="rounded-lg" />
                </FieldGroup>
                <FieldGroup label="Khu vực ưa thích" icon={MapPin} id="pf-district">
                  <Input id="pf-district" placeholder="Phường 1, Vĩnh Long"
                    value={form.preferences.district}
                    onChange={e => setForm(p => ({ ...p, preferences: { ...p.preferences, district: e.target.value } }))}
                    className="rounded-lg" />
                </FieldGroup>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2 rounded-xl px-6">
                <Save className="h-4 w-4" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ── Tab Yêu thích ── */}
        <TabsContent value="favorites" className="mt-4">
          {loadingFavs ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : favRooms.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl border bg-card">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <Heart className="h-8 w-8 text-red-300" />
              </div>
              <div>
                <p className="font-semibold">Chưa có phòng yêu thích</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Bấm ❤️ trên trang chi tiết phòng để lưu vào đây
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5">
                <Link to="/search"><Heart className="h-3.5 w-3.5" />Tìm phòng ngay</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{favRooms.length} phòng đã lưu</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {favRooms.map(room => <RoomCard key={room._id} room={room} />)}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab Bảo mật ── */}
        <TabsContent value="security" className="mt-4">
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Đổi mật khẩu</h2>
                <p className="text-xs text-muted-foreground">Mật khẩu mới phải ít nhất 6 ký tự</p>
              </div>
            </div>
            <Separator />
            <form onSubmit={handleChangePw} className="space-y-4 max-w-sm">
              {[
                { id: 'cur-pw', label: 'Mật khẩu hiện tại', key: 'currentPassword', ac: 'current-password', showKey: 'current' },
                { id: 'new-pw', label: 'Mật khẩu mới', key: 'newPassword', ac: 'new-password', showKey: 'new' },
                { id: 'con-pw', label: 'Xác nhận mật khẩu mới', key: 'confirmPassword', ac: 'new-password', showKey: 'confirm' },
              ].map(({ id, label, key, ac, showKey }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-sm">{label}</Label>
                  <div className="relative">
                    <Input
                      id={id}
                      type={showPw[showKey] ? 'text' : 'password'}
                      autoComplete={ac}
                      value={pwForm[key]}
                      onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                      className="rounded-lg pr-9"
                    />
                    <button type="button"
                      onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={saving} className="gap-2 rounded-xl">
                <Shield className="h-4 w-4" />
                {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </Button>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
