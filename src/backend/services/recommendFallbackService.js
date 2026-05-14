const AMENITY_LIST = [
  'wifi', 'điều_hòa', 'nóng_lạnh', 'tủ_lạnh', 'máy_giặt',
  'bếp', 'chỗ_để_xe', 'an_ninh', 'camera', 'thang_máy',
  'ban_công', 'nội_thất', 'vệ_sinh_riêng', 'điện_nước_riêng',
]

const TYPE_LIST = ['phòng_trọ', 'chung_cư_mini', 'nhà_nguyên_căn', 'ký_túc_xá']
const VECTOR_DIM = 3 + TYPE_LIST.length + AMENITY_LIST.length
const FEATURE_WEIGHTS = [
  ...Array(3).fill(2.0),
  ...Array(TYPE_LIST.length).fill(1.5),
  ...Array(AMENITY_LIST.length).fill(0.7),
]

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function computeStats(rooms) {
  if (!rooms.length) return { priceMin: 0, priceMax: 1, areaMin: 0, areaMax: 1 }
  const prices = rooms.map((r) => number(r.price))
  const areas = rooms.map((r) => number(r.area))
  return {
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    areaMin: Math.min(...areas),
    areaMax: Math.max(...areas),
  }
}

function norm(value, min, max) {
  const span = max - min
  if (Math.abs(span) < 1e-9) return 0.5
  return Math.min(Math.max((value - min) / span, 0), 1)
}

function weighted(vec) {
  return vec.map((value, index) => value * FEATURE_WEIGHTS[index])
}

function buildRoomVector(room, stats) {
  const vec = Array(VECTOR_DIM).fill(0)
  vec[0] = norm(number(room.price), stats.priceMin, stats.priceMax)
  vec[1] = norm(number(room.area), stats.areaMin, stats.areaMax)
  vec[2] = norm(Math.min(number(room.capacity, 1), 10), 1, 10)

  TYPE_LIST.forEach((type, index) => {
    vec[3 + index] = room.roomType === type ? 1 : 0
  })

  const amenities = new Set(room.amenities || [])
  AMENITY_LIST.forEach((amenity, index) => {
    vec[7 + index] = amenities.has(amenity) ? 1 : 0
  })

  return weighted(vec)
}

function buildCriteriaVector(criteria, stats) {
  const vec = Array(VECTOR_DIM).fill(0)
  const priceMin = number(criteria.priceMin)
  const priceMax = number(criteria.priceMax, 10_000_000)
  vec[0] = norm((priceMin + priceMax) / 2, stats.priceMin, stats.priceMax)
  vec[1] = norm(number(criteria.areaMin, 10), stats.areaMin, stats.areaMax)
  vec[2] = norm(Math.min(number(criteria.capacity, 1), 10), 1, 10)

  TYPE_LIST.forEach((type, index) => {
    vec[3 + index] = criteria.roomType ? (criteria.roomType === type ? 1 : 0) : 0.5
  })

  const amenities = new Set(criteria.amenities || [])
  AMENITY_LIST.forEach((amenity, index) => {
    vec[7 + index] = amenities.has(amenity) ? 0.85 : 0
  })

  return weighted(vec)
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0)
}

function magnitude(vec) {
  return Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0))
}

function cosine(a, b) {
  const denom = magnitude(a) * magnitude(b)
  if (denom < 1e-9) return 0
  return Math.min(Math.max(dot(a, b) / denom, 0), 1)
}

function amenityMatch(room, requiredAmenities) {
  if (!requiredAmenities?.length) return 1
  const amenities = new Set(room.amenities || [])
  const matched = requiredAmenities.filter((a) => amenities.has(a)).length
  return Math.max(0.2, matched / requiredAmenities.length)
}

function coordinates(room) {
  const coords = room.location?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = number(coords[0], NaN)
  const lat = number(coords[1], NaN)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function locationScore(room, center, radiusKm) {
  const coords = coordinates(room)
  if (!coords || !center) return 0

  const earthRadiusKm = 6371
  const dLat = (coords.lat - center.lat) * Math.PI / 180
  const dLng = (coords.lng - center.lng) * Math.PI / 180
  const cLat = center.lat * Math.PI / 180
  const rLat = coords.lat * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(cLat) * Math.cos(rLat) * Math.sin(dLng / 2) ** 2
  const distanceKm = 2 * earthRadiusKm * Math.asin(Math.sqrt(Math.min(Math.max(a, 0), 1)))
  const radius = Math.max(number(radiusKm, 5), 1e-9)
  const innerRadius = radius * 0.4

  if (distanceKm <= innerRadius) return 1
  return Math.min(Math.max(1 - (distanceKm - innerRadius) / (radius - innerRadius + 1e-9), 0), 1)
}

function qualityScore(room) {
  return Math.min(Math.max(number(room._behavior), 0.05), 1)
}

function buildUserProfileVector(history, stats) {
  if (!history?.length) return Array(VECTOR_DIM).fill(0)

  const now = Date.now()
  const weightedVectors = history.map((item) => {
    let weight = item.interactionType === 'save' ? 2 : 1
    if (item.interactedAt) {
      const ts = Date.parse(item.interactedAt)
      if (Number.isFinite(ts)) {
        const daysAgo = Math.max((now - ts) / 86_400_000, 0)
        weight *= 0.5 ** (daysAgo / 7)
      }
    }
    return { vec: buildRoomVector(item, stats), weight: Math.max(weight, 1e-9) }
  })

  const totalWeight = weightedVectors.reduce((sum, item) => sum + item.weight, 0)
  return Array.from({ length: VECTOR_DIM }, (_, index) =>
    weightedVectors.reduce((sum, item) => sum + item.vec[index] * item.weight, 0) / totalWeight
  )
}

function personalScore(room, profileVec, stats) {
  if (!profileVec || magnitude(profileVec) < 1e-9) return 0.5
  return cosine(profileVec, buildRoomVector(room, stats))
}

function scoreAndRank({
  candidates,
  targetVec,
  center = null,
  radiusKm = 5,
  weights,
  stats,
  limit,
  requiredAmenities = [],
  userProfileVec = null,
}) {
  if (!candidates.length) return []

  let wContent = number(weights.content, 0.5)
  let wLocation = center ? number(weights.location) : 0
  let wQuality = number(weights.quality, 0.2)
  let wPersonal = userProfileVec ? number(weights.personal) : 0
  const total = [wContent, wLocation, wQuality, wPersonal].filter((w) => w > 0).reduce((a, b) => a + b, 0)
  if (total > 1e-9) {
    wContent /= total
    wLocation /= total
    wQuality /= total
    wPersonal /= total
  }

  return candidates
    .map((room) => {
      const content = cosine(targetVec, buildRoomVector(room, stats)) * amenityMatch(room, requiredAmenities)
      const location = wLocation > 0 ? locationScore(room, center, radiusKm) : 0
      const quality = qualityScore(room)
      const personal = wPersonal > 0 ? personalScore(room, userProfileVec, stats) : 0
      const score = wContent * content + wLocation * location + wQuality * quality + wPersonal * personal
      return { ...room, _score: Math.round(score * 10000) / 10000 }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

function rankSimilar({ target, candidates, center, radiusKm = 10, limit }) {
  const stats = computeStats([target, ...candidates])
  return scoreAndRank({
    candidates,
    targetVec: buildRoomVector(target, stats),
    center,
    radiusKm,
    weights: { content: 0.55, location: 0.25, quality: 0.20 },
    stats,
    limit,
  })
}

function rankWizard({ criteria, candidates, center, limit }) {
  const stats = computeStats(candidates)
  const hasGps = !!center
  return scoreAndRank({
    candidates,
    targetVec: buildCriteriaVector(criteria, stats),
    center,
    radiusKm: number(criteria.radius, 5),
    weights: hasGps
      ? { content: 0.35, location: 0.40, quality: 0.25 }
      : { content: 0.65, location: 0, quality: 0.35 },
    stats,
    limit,
    requiredAmenities: criteria.amenities || [],
  })
}

function rankForYou({ criteria, candidates, userHistory = [], center, limit }) {
  const stats = computeStats(candidates)
  const hasGps = !!center
  const hasHistory = userHistory.length > 0
  const weights = hasHistory
    ? (hasGps
      ? { content: 0.15, location: 0.45, quality: 0.10, personal: 0.30 }
      : { content: 0.30, location: 0, quality: 0.20, personal: 0.50 })
    : (hasGps
      ? { content: 0.20, location: 0.55, quality: 0.25, personal: 0 }
      : { content: 0.65, location: 0, quality: 0.35, personal: 0 })

  return scoreAndRank({
    candidates,
    targetVec: buildCriteriaVector(criteria, stats),
    center,
    radiusKm: number(criteria.radius, 5),
    weights,
    stats,
    limit,
    requiredAmenities: criteria.amenities || [],
    userProfileVec: hasHistory ? buildUserProfileVector(userHistory, stats) : null,
  })
}

module.exports = { rankSimilar, rankWizard, rankForYou }
