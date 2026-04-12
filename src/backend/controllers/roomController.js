const Joi = require('joi')
const mongoose = require('mongoose')
const Room = require('../models/Room')
const sendResponse = require('../utils/apiResponse')

const roomSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().trim().min(10).required(),
  price: Joi.number().min(0).required(),
  area: Joi.number().min(1).required(),
  capacity: Joi.number().integer().min(1).default(1),
  roomType: Joi.string().valid('phòng_trọ', 'chung_cư_mini', 'nhà_nguyên_căn', 'ký_túc_xá').default('phòng_trọ'),
  amenities: Joi.array().items(Joi.string().trim()).default([]),
  images: Joi.array().items(Joi.string().uri()).default([]),
  images360: Joi.array().items(Joi.string().uri()).default([]),
  address: Joi.object({
    street: Joi.string().trim().required(),
    ward: Joi.string().trim().allow('').default(''),
    district: Joi.string().trim().allow('').default(''),
    city: Joi.string().trim().allow('').default('Vĩnh Long'),
    fullAddress: Joi.string().trim().allow('').default(''),
  }).required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  isAvailable: Joi.boolean().default(true),
})

const roomUpdateSchema = roomSchema.fork(['lat', 'lng'], (schema) => schema.optional())

const parseArrayField = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch (error) {
    // fallback below
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseMaybeJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return null

  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch (error) {
    return null
  }

  return null
}

const buildAddressObject = (source = {}) => {
  const parsedAddress = parseMaybeJsonObject(source.address)
  const address = parsedAddress || {
    street: source.street || '',
    ward: source.ward || '',
    district: source.district || '',
    city: source.city || 'Vĩnh Long',
    fullAddress: source.fullAddress || '',
  }

  if (!address.city) address.city = 'Vĩnh Long'
  if (!address.fullAddress) {
    address.fullAddress = [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
  }

  return address
}

const normalizeRoomInput = (body = {}) => {
  const normalized = { ...body }
  normalized.amenities = parseArrayField(body.amenities)
  normalized.images = parseArrayField(body.images)
  normalized.images360 = parseArrayField(body.images360)
  normalized.address = buildAddressObject(body)

  if (body.price !== undefined) normalized.price = Number(body.price)
  if (body.area !== undefined) normalized.area = Number(body.area)
  if (body.capacity !== undefined) normalized.capacity = Number(body.capacity)
  if (body.lat !== undefined) normalized.lat = Number(body.lat)
  if (body.lng !== undefined) normalized.lng = Number(body.lng)

  if (typeof body.isAvailable === 'string') {
    normalized.isAvailable = body.isAvailable === 'true'
  }

  return normalized
}

const toRadians = (value) => (value * Math.PI) / 180

const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

const formatDistanceText = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`
  }
  return `${distanceKm.toFixed(1)} km`
}

const isOwnerOrAdmin = (room, user) => {
  return user.role === 'admin' || String(room.landlord) === String(user._id)
}

exports.createRoom = async (req, res) => {
  try {
    const normalizedInput = normalizeRoomInput(req.body)
    const { value, error } = roomSchema.validate(normalizedInput, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, error.details)
    }

    const room = await Room.create({
      title: value.title,
      description: value.description,
      price: value.price,
      area: value.area,
      capacity: value.capacity,
      roomType: value.roomType,
      amenities: value.amenities,
      images: value.images,
      images360: value.images360,
      address: value.address,
      isAvailable: value.isAvailable,
      landlord: req.user._id,
      location: {
        type: 'Point',
        coordinates: [value.lng, value.lat],
      },
    })

    return sendResponse(res, 201, true, 'Đăng tin phòng thành công', { room })
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.slug) {
      return sendResponse(res, 409, false, 'Slug phòng bị trùng, vui lòng thử lại')
    }
    return sendResponse(res, 500, false, error.message)
  }
}

exports.getRooms = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50)
    const skip = (page - 1) * limit

    const query = {}

    // ── Status: mặc định approved cho public ─────────────────────────
    query.status = req.query.status || 'approved'

    // ── Full-text search ──────────────────────────────────────────────
    if (req.query.q && req.query.q.trim()) {
      query.$text = { $search: req.query.q.trim() }
    }

    // ── Lọc giá ──────────────────────────────────────────────────────
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {}
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice)
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice)
    }

    // ── Lọc diện tích ─────────────────────────────────────────────────
    if (req.query.minArea || req.query.maxArea) {
      query.area = {}
      if (req.query.minArea) query.area.$gte = Number(req.query.minArea)
      if (req.query.maxArea) query.area.$lte = Number(req.query.maxArea)
    }

    // ── Lọc tiện ích (phòng phải có TẤT CẢ tiện ích được chọn) ──────
    if (req.query.amenities) {
      const amenities = parseArrayField(req.query.amenities)
      if (amenities.length > 0) {
        query.amenities = { $all: amenities }
      }
    }

    // ── Lọc địa chỉ ───────────────────────────────────────────────────
    if (req.query.district) query['address.district'] = req.query.district
    if (req.query.ward) query['address.ward'] = req.query.ward

    // ── Lọc loại phòng ────────────────────────────────────────────────
    if (req.query.roomType) query.roomType = req.query.roomType

    // ── Lọc còn trống ─────────────────────────────────────────────────
    if (req.query.isAvailable !== undefined && req.query.isAvailable !== '') {
      query.isAvailable = req.query.isAvailable === 'true'
    }

    // ── Lọc theo bán kính GPS (km) ────────────────────────────────────
    const userLat = Number(req.query.lat)
    const userLng = Number(req.query.lng)
    const radius = Number(req.query.radius)
    if (Number.isFinite(userLat) && Number.isFinite(userLng) && radius > 0) {
      const EARTH_RADIUS_KM = 6371
      query.location = {
        $geoWithin: {
          $centerSphere: [[userLng, userLat], radius / EARTH_RADIUS_KM],
        },
      }
    }

    // ── Sort ──────────────────────────────────────────────────────────
    const sortMap = {
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      newest:     { createdAt: -1 },
      views:      { viewCount: -1 },
    }
    const sortBy = sortMap[req.query.sort] || { createdAt: -1 }

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .populate('landlord', 'name email phone')
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      Room.countDocuments(query),
    ])

    return sendResponse(res, 200, true, 'Lấy danh sách phòng thành công', {
      rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.getMyRooms = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { landlord: req.user._id }
    const rooms = await Room.find(query).sort({ createdAt: -1 })

    return sendResponse(res, 200, true, 'Lấy danh sách phòng của bạn thành công', { rooms })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.getRoomBySlug = async (req, res) => {
  try {
    const room = await Room.findOne({ slug: req.params.slug }).populate('landlord', 'name email phone')
    if (!room) {
      return sendResponse(res, 404, false, 'Không tìm thấy phòng')
    }

    await Room.findByIdAndUpdate(room._id, { $inc: { viewCount: 1 } })
    return sendResponse(res, 200, true, 'Lấy chi tiết phòng thành công', { room })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.getRoomById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendResponse(res, 400, false, 'ID phòng không hợp lệ')
    }

    const room = await Room.findById(req.params.id).populate('landlord', 'name email phone')
    if (!room) {
      return sendResponse(res, 404, false, 'Không tìm thấy phòng')
    }

    await Room.findByIdAndUpdate(room._id, { $inc: { viewCount: 1 } })
    return sendResponse(res, 200, true, 'Lấy chi tiết phòng thành công', { room })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.updateRoom = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendResponse(res, 400, false, 'ID phòng không hợp lệ')
    }

    const room = await Room.findById(req.params.id)
    if (!room) {
      return sendResponse(res, 404, false, 'Không tìm thấy phòng')
    }

    if (!isOwnerOrAdmin(room, req.user)) {
      return sendResponse(res, 403, false, 'Bạn không có quyền cập nhật phòng này')
    }

    const normalizedInput = normalizeRoomInput(req.body)
    const { value, error } = roomUpdateSchema.validate(normalizedInput, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, error.details)
    }

    const updatePayload = { ...value }
    if (value.lat !== undefined && value.lng !== undefined) {
      updatePayload.location = {
        type: 'Point',
        coordinates: [value.lng, value.lat],
      }
    }
    delete updatePayload.lat
    delete updatePayload.lng

    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    })

    return sendResponse(res, 200, true, 'Cập nhật phòng thành công', { room: updatedRoom })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.deleteRoom = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendResponse(res, 400, false, 'ID phòng không hợp lệ')
    }

    const room = await Room.findById(req.params.id)
    if (!room) {
      return sendResponse(res, 404, false, 'Không tìm thấy phòng')
    }

    if (!isOwnerOrAdmin(room, req.user)) {
      return sendResponse(res, 403, false, 'Bạn không có quyền xoá phòng này')
    }

    await Room.findByIdAndDelete(req.params.id)
    return sendResponse(res, 200, true, 'Xoá phòng thành công')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.getDistanceToRoom = async (req, res) => {
  try {
    const { lat, lng } = req.query
    const userLat = Number(lat)
    const userLng = Number(lng)

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return sendResponse(res, 400, false, 'Vui lòng cung cấp lat và lng hợp lệ')
    }

    const room = await Room.findById(req.params.id)
    if (!room) {
      return sendResponse(res, 404, false, 'Không tìm thấy phòng')
    }

    const [roomLng, roomLat] = room.location.coordinates
    const distanceKm = getDistanceKm(userLat, userLng, roomLat, roomLng)

    return sendResponse(res, 200, true, 'Tính khoảng cách thành công', {
      distance_km: Number(distanceKm.toFixed(3)),
      distance_text: formatDistanceText(distanceKm),
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

exports.getNearbyRooms = async (req, res) => {
  try {
    const { lat, lng } = req.query
    const userLat = Number(lat)
    const userLng = Number(lng)
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20)

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return sendResponse(res, 400, false, 'Vui lòng cung cấp lat và lng hợp lệ')
    }

    const nearbyRooms = await Room.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat],
          },
        },
      },
    })
      .limit(limit)
      .select('title slug price location address images')

    const roomsWithDistance = nearbyRooms.map((room) => {
      const [roomLng, roomLat] = room.location.coordinates
      const distanceKm = getDistanceKm(userLat, userLng, roomLat, roomLng)

      return {
        ...room.toObject(),
        distance_km: Number(distanceKm.toFixed(3)),
        distance_text: formatDistanceText(distanceKm),
      }
    })

    return sendResponse(res, 200, true, 'Lấy danh sách phòng gần bạn thành công', {
      rooms: roomsWithDistance,
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
