import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, ChevronLeft, ChevronRight, MapPin, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { wizardRecommendApi } from '@/services/recommendService'
import { WizardResultsSheet } from './WizardResultsSheet'

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5

const ROOM_TYPES = [
  { value: null,             label: 'Tất cả',        emoji: '🏘️' },
  { value: 'phòng_trọ',     label: 'Phòng trọ',     emoji: '🛏️' },
  { value: 'chung_cư_mini', label: 'Chung cư mini',  emoji: '🏢' },
  { value: 'nhà_nguyên_căn',label: 'Nhà nguyên căn', emoji: '🏠' },
  { value: 'ký_túc_xá',    label: 'Ký túc xá',      emoji: '🎓' },
]

const PRICE_RANGES = [
  { label: '< 1 triệu', min: 0,         max: 1_000_000  },
  { label: '1–2 triệu', min: 1_000_000, max: 2_000_000  },
  { label: '2–3 triệu', min: 2_000_000, max: 3_000_000  },
  { label: '3–5 triệu', min: 3_000_000, max: 5_000_000  },
  { label: '> 5 triệu', min: 5_000_000, max: 20_000_000 },
  { label: 'Linh hoạt', min: 0,         max: 20_000_000 },
]

const AREA_OPTIONS   = [10, 15, 20, 25, 30, 40]
const CAP_OPTIONS    = [{ value: 1, label: '1 người' }, { value: 2, label: '2 người' }, { value: 3, label: '3+ người' }]
const RADIUS_OPTIONS = [1, 3, 5, 10]

const AMENITY_OPTIONS = [
  { value: 'wifi',            label: 'Wifi',         emoji: '📶' },
  { value: 'điều_hòa',       label: 'Điều hòa',     emoji: '❄️' },
  { value: 'nóng_lạnh',      label: 'Nóng lạnh',    emoji: '🚿' },
  { value: 'tủ_lạnh',        label: 'Tủ lạnh',      emoji: '🧊' },
  { value: 'máy_giặt',       label: 'Máy giặt',     emoji: '🫧' },
  { value: 'bếp',            label: 'Bếp nấu',      emoji: '🍳' },
  { value: 'chỗ_để_xe',      label: 'Chỗ để xe',    emoji: '🏍️' },
  { value: 'an_ninh',        label: 'An ninh',       emoji: '🔒' },
  { value: 'ban_công',       label: 'Ban công',      emoji: '🌿' },
  { value: 'nội_thất',       label: 'Nội thất',      emoji: '🛋️' },
  { value: 'vệ_sinh_riêng',  label: 'VS riêng',      emoji: '🚽' },
  { value: 'thang_máy',      label: 'Thang máy',     emoji: '🛗' },
]

// ── Slide animation ───────────────────────────────────────────────────────────
const variants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center:        { x: 0, opacity: 1 },
  exit:  (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
}

// ── Chip selector ─────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border hover:border-primary/40 hover:bg-muted/60',
        className
      )}
    >
      {children}
      {active && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
    </button>
  )
}

// ── Step components ───────────────────────────────────────────────────────────
function Step1({ answers, set }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Bạn muốn thuê loại phòng nào?</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ROOM_TYPES.map(({ value, label, emoji }) => (
          <Chip
            key={String(value)}
            active={answers.roomType === value}
            onClick={() => set('roomType', value)}
          >
            <span>{emoji}</span> {label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Step2({ answers, set }) {
  const active = PRICE_RANGES.find(
    (r) => r.min === answers.priceMin && r.max === answers.priceMax
  )
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Ngân sách hàng tháng?</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PRICE_RANGES.map((r) => (
          <Chip
            key={r.label}
            active={active?.label === r.label}
            onClick={() => { set('priceMin', r.min); set('priceMax', r.max) }}
          >
            {r.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Step3({ answers, set }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="font-semibold">Diện tích tối thiểu?</h3>
        <div className="flex flex-wrap gap-2">
          {AREA_OPTIONS.map((a) => (
            <Chip key={a} active={answers.areaMin === a} onClick={() => set('areaMin', a)}>
              {a} m²
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Số người ở?</h3>
        <div className="flex gap-2">
          {CAP_OPTIONS.map(({ value, label }) => (
            <Chip key={value} active={answers.capacity === value} onClick={() => set('capacity', value)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

function Step4({ answers, set }) {
  const toggle = (v) => {
    const cur = answers.amenities
    const next = cur.includes(v) ? cur.filter((a) => a !== v) : [...cur, v]
    set('amenities', next)
  }
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Tiện ích quan trọng với bạn?</h3>
      <p className="text-xs text-muted-foreground">Chọn bao nhiêu tuỳ thích</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AMENITY_OPTIONS.map(({ value, label, emoji }) => (
          <Chip
            key={value}
            active={answers.amenities.includes(value)}
            onClick={() => toggle(value)}
          >
            <span>{emoji}</span> {label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Step5({ answers, set }) {
  const [locating, setLocating] = useState(false)

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Trình duyệt không hỗ trợ GPS'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { set('lat', pos.coords.latitude); set('lng', pos.coords.longitude); setLocating(false) },
      ()    => { toast.error('Không lấy được vị trí'); setLocating(false) }
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="font-semibold">Khu vực muốn ở?</h3>
        <Button
          type="button"
          variant={answers.lat ? 'default' : 'outline'}
          className="gap-2 w-full sm:w-auto"
          onClick={getLocation}
          disabled={locating}
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {answers.lat ? '✅ Đã lấy vị trí của bạn' : 'Dùng vị trí của tôi (GPS)'}
        </Button>
        {answers.lat && (
          <p className="text-xs text-muted-foreground">
            ({answers.lat.toFixed(4)}, {answers.lng.toFixed(4)})
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Bán kính tìm kiếm</h3>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <Chip key={r} active={answers.radius === r} onClick={() => set('radius', r)}>
              {r} km
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
const DEFAULTS = {
  roomType:  null,
  priceMin:  0,
  priceMax:  20_000_000,
  areaMin:   10,
  capacity:  1,
  amenities: [],
  lat:       null,
  lng:       null,
  radius:    5,
}

export function RoomFinderWizard({ open, onClose }) {
  const [step, setStep]         = useState(1)
  const [dir, setDir]           = useState(1)
  const [answers, setAnswers]   = useState(DEFAULTS)
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState(null)
  const [showResults, setShowResults] = useState(false)

  const set = useCallback((key, val) => setAnswers((prev) => ({ ...prev, [key]: val })), [])

  const goNext = () => { setDir(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS)) }
  const goPrev = () => { setDir(-1); setStep((s) => Math.max(s - 1, 1)) }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const res = await wizardRecommendApi({ ...answers, limit: 12 })
      const rooms = res.data?.data?.rooms || []
      setResults(rooms)
      setShowResults(true)
    } catch {
      toast.error('Không thể tìm kiếm. Thử lại sau!')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1); setDir(1); setAnswers(DEFAULTS); setResults(null)
    onClose()
  }

  const STEPS = [
    { label: 'Loại phòng', component: <Step1 answers={answers} set={set} /> },
    { label: 'Ngân sách',  component: <Step2 answers={answers} set={set} /> },
    { label: 'Diện tích',  component: <Step3 answers={answers} set={set} /> },
    { label: 'Tiện ích',   component: <Step4 answers={answers} set={set} /> },
    { label: 'Khu vực',    component: <Step5 answers={answers} set={set} /> },
  ]

  return (
    <>
      <Dialog open={open && !showResults} onOpenChange={handleClose}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Tìm trọ nhanh — Bước {step}/{TOTAL_STEPS}
            </DialogTitle>
          </DialogHeader>

          {/* Progress */}
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />

          {/* Step labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
            {STEPS.map(({ label }, i) => (
              <span key={i} className={cn(i + 1 <= step && 'text-primary font-medium')}>
                {label}
              </span>
            ))}
          </div>

          {/* Step content with animation */}
          <div className="relative min-h-[220px] overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="absolute inset-0 overflow-y-auto pb-2"
              >
                {STEPS[step - 1].component}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={goPrev} disabled={step === 1} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </Button>

            {step < TOTAL_STEPS ? (
              <Button onClick={goNext} className="gap-1">
                Tiếp theo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="gap-2 min-w-[110px]">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tìm...</>
                  : <><Sparkles className="h-4 w-4" /> Tìm phòng</>
                }
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Results */}
      <WizardResultsSheet
        open={showResults}
        rooms={results || []}
        onClose={() => { setShowResults(false); handleClose() }}
        onRetry={() => setShowResults(false)}
      />
    </>
  )
}
