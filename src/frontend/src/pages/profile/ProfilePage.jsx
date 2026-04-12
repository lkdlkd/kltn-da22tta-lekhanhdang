import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Camera, KeyRound, User, Heart, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getProfileApi, updateProfileApi, changePasswordApi } from '@/services/userService'
import { getFavoritesApi } from '@/services/favoriteService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Link } from 'react-router-dom'

const ROLE_LABEL = { student: 'Sinh viên', landlord: 'Chủ trọ', admin: 'Quản trị viên' }

function AvatarUpload({ avatarUrl, name, onFile }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(avatarUrl || null)

  useEffect(() => { setPreview(avatarUrl || null) }, [avatarUrl])

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Ảnh tối đa 5MB'); return }
    setPreview(URL.createObjectURL(file))
    onFile(file)
  }

  const initial = (name || '?')[0].toUpperCase()

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary ring-4 ring-background shadow-md">
          {preview
            ? <img src={preview} alt="avatar" className="h-full w-full object-cover" />
            : initial}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>
      <p className="text-xs text-muted-foreground">JPG, PNG · Tối đa 5MB</p>
    </div>
  )
}

export default function ProfilePage() {
  const authUser = useSelector((state) => state.auth?.user)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    preferences: { maxPrice: '', minArea: '', district: '' },
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [favRooms, setFavRooms] = useState([])
  const [loadingFavs, setLoadingFavs] = useState(false)

  useEffect(() => {
    getProfileApi()
      .then((res) => {
        const u = res.data?.data?.user
        if (!u) { setError('Không tải được hồ sơ'); return }
        setUser(u)
        setForm({
          name: u.name || '',
          phone: u.phone || '',
          preferences: {
            maxPrice: u.preferences?.maxPrice || '',
            minArea: u.preferences?.minArea || '',
            district: u.preferences?.district || '',
          },
        })
      })
      .catch((err) => {
        const msg = err.response?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Không thể tải hồ sơ. Vui lòng kiểm tra kết nối.'
        setError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const loadFavorites = () => {
    if (loadingFavs) return
    setLoadingFavs(true)
    getFavoritesApi()
      .then((res) => setFavRooms(res.data?.data?.rooms || []))
      .catch(() => toast.error('Không thể tải danh sách yêu thích'))
      .finally(() => setLoadingFavs(false))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Tên không được để trống'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('phone', form.phone.trim())
      // Send preferences as JSON string (backend will JSON.parse)
      fd.append('preferences', JSON.stringify({
        maxPrice: Number(form.preferences.maxPrice) || null,
        minArea: Number(form.preferences.minArea) || null,
        district: form.preferences.district.trim() || null,
      }))
      if (avatarFile) fd.append('avatar', avatarFile)

      const res = await updateProfileApi(fd)
      const updated = res.data?.data?.user
      if (updated) {
        setUser(updated)
        setForm({
          name: updated.name || '',
          phone: updated.phone || '',
          preferences: {
            maxPrice: updated.preferences?.maxPrice || '',
            minArea: updated.preferences?.minArea || '',
            district: updated.preferences?.district || '',
          },
        })
      }
      setAvatarFile(null)
      toast.success('Cập nhật hồ sơ thành công!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('Vui lòng điền đầy đủ thông tin'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Mật khẩu mới không khớp'); return }
    if (pwForm.newPassword.length < 6) { toast.error('Mật khẩu mới phải có ít nhất 6 ký tự'); return }
    setSaving(true)
    try {
      await changePasswordApi({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Đổi mật khẩu thành công!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không đúng')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error || !user) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-lg font-semibold">Không thể tải hồ sơ</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {error || 'Phiên đăng nhập có thể đã hết hạn. Vui lòng đăng nhập lại.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
          <Button asChild><Link to="/login">Đăng nhập lại</Link></Button>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Hồ sơ cá nhân</h1>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABEL[user.role] || user.role} · {user.email}
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" onValueChange={(v) => v === 'favorites' && loadFavorites()}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">
            <User className="mr-1.5 h-3.5 w-3.5" />Thông tin
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="mr-1.5 h-3.5 w-3.5" />Yêu thích
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />Bảo mật
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Thông tin ───────────────────────────────────────────── */}
        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <AvatarUpload
                  avatarUrl={user.avatar}
                  name={user.name}
                  onFile={setAvatarFile}
                />

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pf-name">Họ và tên</Label>
                    <Input
                      id="pf-name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pf-phone">Số điện thoại</Label>
                    <Input
                      id="pf-phone"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="0901234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="opacity-60 cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Sở thích tìm phòng</Label>
                  <p className="text-xs text-muted-foreground">
                    Giúp AI gợi ý phòng phù hợp hơn với bạn
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs" htmlFor="pf-maxprice">Giá tối đa (VNĐ)</Label>
                      <Input
                        id="pf-maxprice"
                        type="number"
                        min={0}
                        placeholder="3000000"
                        value={form.preferences.maxPrice}
                        onChange={(e) => setForm((p) => ({
                          ...p,
                          preferences: { ...p.preferences, maxPrice: e.target.value },
                        }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs" htmlFor="pf-minarea">Diện tích tối thiểu (m²)</Label>
                      <Input
                        id="pf-minarea"
                        type="number"
                        min={0}
                        placeholder="15"
                        value={form.preferences.minArea}
                        onChange={(e) => setForm((p) => ({
                          ...p,
                          preferences: { ...p.preferences, minArea: e.target.value },
                        }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs" htmlFor="pf-district">Khu vực ưa thích</Label>
                      <Input
                        id="pf-district"
                        placeholder="Phường 1, Vĩnh Long"
                        value={form.preferences.district}
                        onChange={(e) => setForm((p) => ({
                          ...p,
                          preferences: { ...p.preferences, district: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Yêu thích ───────────────────────────────────────────── */}
        <TabsContent value="favorites">
          <div className="space-y-4">
            {loadingFavs ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : favRooms.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Heart className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-medium">Chưa có phòng yêu thích</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bấm nút ❤️ trên trang chi tiết phòng để lưu vào đây
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/search">Tìm phòng ngay</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {favRooms.map((room) => <RoomCard key={room._id} room={room} />)}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Bảo mật ────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" /> Đổi mật khẩu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="cur-pw">Mật khẩu hiện tại</Label>
                  <Input
                    id="cur-pw"
                    type="password"
                    autoComplete="current-password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw">Mật khẩu mới</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
