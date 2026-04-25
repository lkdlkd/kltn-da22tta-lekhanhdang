/**
 * getApproxLocation
 * Lấy vị trí gần đúng (cấp thành phố) bằng IP geolocation — không cần permission.
 *
 * Chiến lược:
 *  1. Kiểm tra cache sessionStorage (tránh gọi API nhiều lần / trang)
 *  2. Browser GPS nếu đã có permission sẵn (nhanh, chính xác)
 *  3. ipwho.is  — free, không cần API key, không rate-limit nghiêm
 *  4. ipinfo.io — 50k req/tháng free, backup
 *  5. Trả null nếu tất cả thất bại (im lặng)
 */

const CACHE_KEY = 'approx_location'
const CACHE_TTL = 30 * 60 * 1000 // 30 phút

/** fetch với timeout, tương thích Safari (không dùng AbortSignal.timeout) */
function fetchT(url, ms = 5000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t))
}

/** Đọc cache sessionStorage */
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null }
    return { lat, lng }
  } catch { return null }
}

/** Ghi cache sessionStorage */
function writeCache(lat, lng) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() })) } catch {}
}

/** Lấy GPS từ browser nếu đã có permission (không popup nếu chưa cấp) */
function tryBrowserGps(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      ()  => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120000 }
    )
  })
}

/** Thử IP geo với danh sách dịch vụ tuần tự */
async function tryIpServices() {
  const services = [
    { url: 'https://ipwho.is/',      parse: d => d?.success && d.latitude && d.longitude ? { lat: d.latitude,  lng: d.longitude  } : null },
    { url: 'https://ipinfo.io/json', parse: d => {
      if (!d?.loc) return null
      const [lat, lng] = d.loc.split(',').map(Number)
      return isNaN(lat) ? null : { lat, lng }
    }},
  ]
  for (const { url, parse } of services) {
    try {
      const res = await fetchT(url, 5000)
      if (!res.ok) continue
      const data = await res.json()
      const coords = parse(data)
      if (coords) return coords
    } catch { /* tiếp tục service kế tiếp */ }
  }
  return null
}

/**
 * Hàm chính — gọi từ component.
 * @returns {{ lat: number, lng: number } | null}
 */
export async function getApproxLocation() {
  // 1. Cache hit
  const cached = readCache()
  if (cached) return cached

  // 2. Browser GPS (nếu đã có permission, không cần user gesture)
  const gps = await tryBrowserGps()
  if (gps) { writeCache(gps.lat, gps.lng); return gps }

  // 3. IP geo fallback
  const ip = await tryIpServices()
  if (ip) { writeCache(ip.lat, ip.lng); return ip }

  return null
}
