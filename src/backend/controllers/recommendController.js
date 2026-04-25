const Room = require('../models/Room')
const Favorite = require('../models/Favorite')
const Interaction = require('../models/Interaction')
const sendResponse = require('../utils/apiResponse')
const { callAI } = require('../services/aiProxyService')

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Serialize a Mongoose room doc → plain object safe for JSON + FastAPI */
function serializeRoom(room) {
  const r = room.toObject ? room.toObject() : { ...room }
  return {
    _id: String(r._id),
    title: r.title || '',
    price: r.price || 0,
    area: r.area || 0,
    capacity: r.capacity || 1,
    roomType: r.roomType || 'phòng_trọ',
    amenities: r.amenities || [],
    location: r.location,
    images: r.images || [],
    slug: r.slug || '',
    address: r.address || '',
    viewCount: r.viewCount || 0,
    isAvailable: r.isAvailable ?? true,
    landlord: r.landlord || null,
    _behavior: r._behavior || 0,
  }
}

/** Build { roomId → favoriteCount } map from DB */
async function buildBehaviorMap(roomIds) {
  const favCounts = await Favorite.aggregate([
    { $match: { room: { $in: roomIds } } },
    { $group: { _id: '$room', count: { $sum: 1 } } },
  ])
  return Object.fromEntries(favCounts.map((f) => [String(f._id), f.count]))
}

/** Normalize _behavior ∈ [0,1]: 40% viewCount + 60% favorites */
function attachBehavior(rooms, favMap) {
  const maxView = Math.max(...rooms.map((r) => r.viewCount || 0), 1)
  const maxFav = Math.max(...Object.values(favMap).concat([1]))
  return rooms.map((r) => ({
    ...r,
    _behavior:
      0.4 * ((r.viewCount || 0) / maxView)
      + 0.6 * ((favMap[String(r._id)] || 0) / maxFav),
  }))
}

/** Fallback sort by viewCount when AI is unavailable */
function fallbackSort(rooms, limit) {
  return [...rooms].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, limit)
}

/** Apply filters to MongoDB query */
function buildMongoFilter({ roomType, priceMin, priceMax, areaMin, capacity, lat, lng, radius = 5 }) {
  const filter = { status: 'approved', isAvailable: true }
  if (priceMin !== undefined || priceMax !== undefined) {
    filter.price = {}
    if (priceMin !== undefined) filter.price.$gte = Math.max(0, Number(priceMin) * 0.85)
    if (priceMax !== undefined) filter.price.$lte = Number(priceMax) * 1.15
  }
  if (areaMin) filter.area = { $gte: Number(areaMin) }
  if (capacity) filter.capacity = { $gte: Number(capacity) }
  if (roomType && roomType !== 'all') filter.roomType = roomType
  if (lat && lng) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius) * 1000,
      },
    }
  }
  return filter
}

/**
 * Fetch user interaction history for FastAPI personal profile.
 * Returns array of { roomType, price, area, capacity, amenities, interactionType }
 */
async function fetchUserHistory(userId) {
  const interactions = await Interaction.find({
    user: userId,
    type: { $in: ['view', 'save'] },
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('room', 'roomType price area capacity amenities')

  return interactions
    .filter((i) => i.room)
    .map((i) => ({
      roomId: String(i.room._id),  // ← thêm để exclude
      roomType: i.room.roomType || 'phòng_trọ',
      price: i.room.price || 0,
      area: i.room.area || 0,
      capacity: i.room.capacity || 1,
      amenities: i.room.amenities || [],
      interactionType: i.type,
      interactedAt: i.createdAt.toISOString(),
    }))
}

/**
 * Infer implicit criteria from interaction history.
 * Used to build MongoDB filter when user provides no explicit criteria.
 */
function inferCriteriaFromHistory(history) {
  if (!history.length) return null

  // Most common roomType
  const typeCounts = {}
  history.forEach((h) => { typeCounts[h.roomType] = (typeCounts[h.roomType] || 0) + 1 })
  const roomType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // Median price ± soft range
  const prices = history.map((h) => h.price || 0).sort((a, b) => a - b)
  const medianPrice = prices[Math.floor(prices.length / 2)] || 2_000_000
  const priceMin = Math.round(medianPrice * 0.5)
  const priceMax = Math.round(medianPrice * 1.6)

  // Common amenities (≥30%)
  const amenityCounts = {}
  history.forEach((h) =>
    (h.amenities || []).forEach((a) => { amenityCounts[a] = (amenityCounts[a] || 0) + 1 })
  )
  const threshold = Math.max(1, Math.round(history.length * 0.3))
  const amenities = Object.entries(amenityCounts)
    .filter(([, c]) => c >= threshold)
    .map(([a]) => a)

  return { roomType, priceMin, priceMax, amenities }
}

// ══════════════════════════════════════════════════════════════════════════════
// API 1 — GET /api/recommend/similar/:id
// Gợi ý phòng tương tự phòng đang xem → FastAPI /recommend/similar
// ══════════════════════════════════════════════════════════════════════════════
exports.getSimilarRooms = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 12)
    const target = await Room.findById(req.params.id).populate('landlord', 'name avatar')
    if (!target) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    const [lng, lat] = target.location.coordinates

    // Tier 1: cùng loại + trong 10km
    const tier1 = await Room.find({
      _id: { $ne: target._id },
      status: 'approved', isAvailable: true,
      roomType: target.roomType,
      location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 10_000 } },
    }).limit(120).populate('landlord', 'name avatar')

    // Tier 2: mở rộng loại phòng trong 15km nếu chưa đủ
    let extra = []
    if (tier1.length < 20) {
      extra = await Room.find({
        _id: { $nin: [target._id, ...tier1.map(r => r._id)] },
        status: 'approved', isAvailable: true,
        location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 15_000 } },
      }).limit(80).populate('landlord', 'name avatar')
    }

    const candidates = [...tier1, ...extra]
    if (!candidates.length) return sendResponse(res, 200, true, 'Phòng tương tự', { rooms: [] })

    const favMap = await buildBehaviorMap(candidates.map(r => r._id))
    const plainCandidates = attachBehavior(candidates.map(serializeRoom), favMap)

    let rooms
    try {
      rooms = await callAI('similar', {
        target: serializeRoom(target), candidates: plainCandidates,
        center: { lat, lng }, radius_km: 10, limit,
      })
    } catch { rooms = fallbackSort(plainCandidates, limit) }

    // ── Tier 3 padding: bổ sung nếu vẫn chưa đủ limit ──────────────────────────
    if (rooms.length < limit) {
      const need = limit - rooms.length
      const usedIds = new Set([String(target._id), ...rooms.map(r => String(r._id))])

      // Không giới hạn khoảng cách — $near không có $maxDistance sẽ sắp xếp gần nhất toàn cầu
      const tier3 = await Room.find({
        _id: { $nin: [...usedIds] },
        status: 'approved', isAvailable: true,
        location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] } } },
      }).limit(need * 6).populate('landlord', 'name avatar')

      if (tier3.length) {
        const favMap3 = await buildBehaviorMap(tier3.map(r => r._id))
        const plain3 = attachBehavior(tier3.map(serializeRoom), favMap3)
        let padRooms
        try {
          padRooms = await callAI('similar', {
            target: serializeRoom(target), candidates: plain3,
            center: { lat, lng }, radius_km: 999, limit: need,
          })
        } catch { padRooms = fallbackSort(plain3, need) }
        rooms = [...rooms, ...padRooms]
      }
    }

    return sendResponse(res, 200, true, 'Phòng tương tự', { rooms })
  } catch (err) {
    return sendResponse(res, 500, false, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API 2 — POST /api/recommend/wizard
// Gợi ý theo tiêu chí tìm kiếm → FastAPI /recommend/wizard
// ══════════════════════════════════════════════════════════════════════════════
exports.wizardRecommend = async (req, res) => {
  try {
    const {
      roomType, priceMin, priceMax, areaMin, capacity,
      amenities = [], lat, lng, radius = 5, limit = 12,
    } = req.body

    const effectiveLimit = Math.min(Number(limit), 24)
    const filter = buildMongoFilter({ roomType, priceMin, priceMax, areaMin, capacity, lat, lng, radius })

    const rawCandidates = await Room.find(filter).limit(300).populate('landlord', 'name avatar')
    if (!rawCandidates.length) {
      return sendResponse(res, 200, true, 'Không tìm thấy phòng phù hợp', { rooms: [], total: 0 })
    }

    const favMap = await buildBehaviorMap(rawCandidates.map(r => r._id))
    const plainCandidates = attachBehavior(rawCandidates.map(serializeRoom), favMap)
    const criteria = { roomType, priceMin, priceMax, areaMin, capacity, amenities, radius }

    let rooms
    try {
      rooms = await callAI('wizard', {
        criteria,
        candidates: plainCandidates,
        center: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
        limit: effectiveLimit,
      })
    } catch { rooms = fallbackSort(plainCandidates, effectiveLimit) }

    return sendResponse(res, 200, true, `Gợi ý ${rooms.length} phòng phù hợp`, { rooms, total: rooms.length })
  } catch (err) {
    return sendResponse(res, 500, false, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API 3 — POST /api/recommend/for-you  (yêu cầu đăng nhập)
// Gợi ý cá nhân hóa → FastAPI /recommend/for-you (4 components)
//
// Pipeline:
//   1. Fetch 30 interactions gần nhất → userHistory
//   2. Infer implicit criteria (roomType, price, amenities) nếu user không nhập
//   3. Merge user-provided criteria ưu tiên cao hơn implicit
//   4. Build MongoDB filter từ merged criteria → lấy candidates
//   5. Gửi FastAPI /for-you với { criteria, candidates, userHistory, center }
//   6. FastAPI xây user_profile_vec từ userHistory, chấm 4 components
// ══════════════════════════════════════════════════════════════════════════════
exports.forYouRecommend = async (req, res) => {
  try {
    const {
      roomType: userRoomType,
      priceMin: userPriceMin,
      priceMax: userPriceMax,
      areaMin: userAreaMin,
      capacity: userCapacity,
      amenities: userAmenities = [],
      lat, lng, radius = 5,
      limit = 12,
    } = req.body

    const effectiveLimit = Math.min(Number(limit), 24)

    // ── Bước 1: Lấy interaction history từ DB ────────────────────────────
    const userHistory = await fetchUserHistory(req.user._id)

    // ── Bước 2: Infer implicit criteria từ history ───────────────────────
    const implicit = inferCriteriaFromHistory(userHistory)

    // ── Bước 3: Merge — user criteria > implicit > defaults ──────────────
    const roomType = userRoomType || implicit?.roomType || null
    const priceMin = userPriceMin ?? implicit?.priceMin ?? 0
    const priceMax = userPriceMax ?? implicit?.priceMax ?? 20_000_000
    const areaMin = userAreaMin || 0
    const capacity = userCapacity || 1
    const amenities = [...new Set([...userAmenities, ...(implicit?.amenities || [])])]

    // ── Bước 4: Build MongoDB filter ──────────────────────────────────
    // Chỉ dùng criteria user nhập rõ để filter MongoDB.
    // Không loại trừ phòng đã xem: user có thể muốn xem lại phòng yêu thích
    // + FastAPI tự trung hòa giữa phòng đã xem và phòng tương tự mới
    const mongoFilter = buildMongoFilter({
      roomType: userRoomType || null,
      priceMin: userPriceMin ?? 0,
      priceMax: userPriceMax ?? 20_000_000,
      areaMin: userAreaMin || 0,
      capacity: userCapacity || 1,
      lat, lng,
      radius: lat && lng ? Number(radius) * 1.5 : radius,
    })

    let rawCandidates = await Room.find(mongoFilter).limit(300).populate('landlord', 'name avatar')

    // Nếu có GPS mà không có kết quả → retry không có GPS (tránh empty với vùng ít phòng)
    if (!rawCandidates.length && lat && lng) {
      const { location: _loc, ...filterWithoutGps } = mongoFilter
      rawCandidates = await Room.find(filterWithoutGps).limit(300).populate('landlord', 'name avatar')
    }

    if (!rawCandidates.length) {
      return sendResponse(res, 200, true, 'Không tìm thấy phòng phù hợp', { rooms: [], total: 0 })
    }

    // ── Bước 5: Tính behavior score ──────────────────────────────────────
    const favMap = await buildBehaviorMap(rawCandidates.map(r => r._id))
    const plainCandidates = attachBehavior(rawCandidates.map(serializeRoom), favMap)

    // ── Bước 6: Gửi FastAPI /for-you với userHistory ─────────────────────
    const criteria = { roomType, priceMin, priceMax, areaMin, capacity, amenities, radius }

    let rooms
    try {
      rooms = await callAI('for-you', {
        criteria,
        candidates: plainCandidates,
        userHistory,   // FastAPI xây user_profile_vec từ đây
        center: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
        limit: effectiveLimit,
      })
    } catch { rooms = fallbackSort(plainCandidates, effectiveLimit) }

    return sendResponse(res, 200, true, `Gợi ý cá nhân ${rooms.length} phòng`, {
      rooms,
      total: rooms.length,
      usedCriteria: { roomType, priceMin, priceMax, amenities, hasImplicit: !!implicit },
    })
  } catch (err) {
    return sendResponse(res, 500, false, err.message)
  }
}
