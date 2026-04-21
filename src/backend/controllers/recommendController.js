const Room = require('../models/Room')
const Favorite = require('../models/Favorite')
const sendResponse = require('../utils/apiResponse')
const { callAI } = require('../services/aiProxyService')

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Serialize a Mongoose room doc to plain object safe for JSON + FastAPI */
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
    averageRating: r.averageRating || 0,
    reviewCount: r.reviewCount || 0,
    viewCount: r.viewCount || 0,
    landlord: r.landlord || null,
    _behavior: r._behavior || 0,
  }
}

/**
 * Compute normalized behavior score for a list of rooms.
 * Aggregate favoriteCount from DB, then combine with viewCount + reviewCount.
 * Returns a map: { roomId (string) → behaviorScore (0–1) }
 */
async function buildBehaviorMap(roomIds) {
  const favCounts = await Favorite.aggregate([
    { $match: { room: { $in: roomIds } } },
    { $group: { _id: '$room', count: { $sum: 1 } } },
  ])
  const favMap = Object.fromEntries(favCounts.map((f) => [String(f._id), f.count]))
  return favMap
}

function attachBehavior(rooms, favMap) {
  const maxView = Math.max(...rooms.map((r) => r.viewCount || 0), 1)
  const maxFav = Math.max(...Object.values(favMap), 1)

  return rooms.map((r) => ({
    ...r,
    // _behavior ∈ [0, 1]
    // review feature removed — engagement = view (40%) + favorites (60%)
    _behavior:
      0.4 * ((r.viewCount || 0) / maxView) +
      0.6 * ((favMap[String(r._id)] || 0) / maxFav),
  }))
}

/** Simple fallback: sort by viewCount desc when AI service is unavailable */
function fallbackSort(rooms, limit) {
  return [...rooms].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, limit)
}

// ── GET /api/rooms/:id/similar?limit=6 ───────────────────────────────────────
exports.getSimilarRooms = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 12)
    const target = await Room.findById(req.params.id).populate('landlord', 'name avatar')
    if (!target) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    const [lng, lat] = target.location.coordinates

    // Hard filter: nearby approved rooms, exclude self
    const candidates = await Room.find({
      _id: { $ne: target._id },
      status: 'approved',
      isAvailable: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 15_000, // 15km
        },
      },
    })
      .limit(200)
      .populate('landlord', 'name avatar')

    // Attach behavior score
    const allIds = candidates.map((r) => r._id)
    const favMap = await buildBehaviorMap(allIds)
    const plainCandidates = attachBehavior(candidates.map(serializeRoom), favMap)

    // Call FastAPI
    let rooms
    try {
      rooms = await callAI('similar', {
        target: serializeRoom(target),
        candidates: plainCandidates,
        center: { lat, lng },
        radius_km: 10,
        limit,
      })
    } catch {
      // Fallback: sort by viewCount
      rooms = fallbackSort(plainCandidates, limit)
    }

    return sendResponse(res, 200, true, 'Phòng tương tự', { rooms })
  } catch (err) {
    return sendResponse(res, 500, false, err.message)
  }
}

// ── POST /api/rooms/wizard-recommend ─────────────────────────────────────────
exports.wizardRecommend = async (req, res) => {
  try {
    const {
      roomType, priceMin, priceMax, areaMin, capacity,
      amenities = [], lat, lng, radius = 5, limit = 12,
    } = req.body

    const effectiveLimit = Math.min(Number(limit), 24)

    // Build MongoDB filter
    const filter = {
      status: 'approved',
      isAvailable: true,
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      filter.price = {}
      if (priceMin !== undefined) filter.price.$gte = Number(priceMin)
      if (priceMax !== undefined) filter.price.$lte = Number(priceMax)
    }
    if (areaMin) filter.area = { $gte: Number(areaMin) }
    if (capacity) filter.capacity = { $gte: Number(capacity) }
    if (roomType && roomType !== 'all') filter.roomType = roomType

    // GPS-based geo filter
    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius) * 1000,
        },
      }
    }

    const rawCandidates = await Room.find(filter)
      .limit(300)
      .populate('landlord', 'name avatar')

    if (!rawCandidates.length) {
      return sendResponse(res, 200, true, 'Không tìm thấy phòng phù hợp', { rooms: [], total: 0 })
    }

    // Attach behavior score
    const allIds = rawCandidates.map((r) => r._id)
    const favMap = await buildBehaviorMap(allIds)
    const plainCandidates = attachBehavior(rawCandidates.map(serializeRoom), favMap)

    const criteria = { roomType, priceMin, priceMax, areaMin, capacity, amenities, radius }

    // Call FastAPI
    let rooms
    try {
      rooms = await callAI('wizard', {
        criteria,
        candidates: plainCandidates,
        center: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
        limit: effectiveLimit,
      })
    } catch {
      rooms = fallbackSort(plainCandidates, effectiveLimit)
    }

    return sendResponse(res, 200, true, `Gợi ý ${rooms.length} phòng phù hợp`, {
      rooms,
      total: rooms.length,
    })
  } catch (err) {
    return sendResponse(res, 500, false, err.message)
  }
}
