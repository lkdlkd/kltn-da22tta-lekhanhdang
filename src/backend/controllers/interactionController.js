const Interaction = require('../models/Interaction')
const sendResponse = require('../utils/apiResponse')

// POST /api/interactions
exports.createInteraction = async (req, res) => {
  try {
    const { roomId, type } = req.body
    if (!roomId || !type) return sendResponse(res, 400, false, 'Thiếu roomId hoặc type')
    // Cho phép nhiều lần view nhưng không duplicate trong 1 giờ
    if (type === 'view') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const existing = await Interaction.findOne({
        user: req.user._id,
        room: roomId,
        type: 'view',
        createdAt: { $gte: oneHourAgo },
      })
      if (existing) return sendResponse(res, 200, true, 'Already tracked')
    }
    await Interaction.create({ user: req.user._id, room: roomId, type })
    return sendResponse(res, 201, true, 'Ghi nhận tương tác thành công')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/interactions/recently-viewed
exports.getRecentlyViewed = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 20)
    // Lấy các phòng view gần nhất, không trùng lặp
    const interactions = await Interaction.find({ user: req.user._id, type: 'view' })
      .sort({ createdAt: -1 })
      .populate({ path: 'room', populate: { path: 'landlord', select: 'name' } })
      .limit(limit * 3) // lấy dư để deduplicate

    // Deduplicate theo room ID
    const seen = new Set()
    const rooms = []
    for (const inter of interactions) {
      if (!inter.room) continue
      const id = String(inter.room._id)
      if (!seen.has(id)) { seen.add(id); rooms.push(inter.room) }
      if (rooms.length >= limit) break
    }
    return sendResponse(res, 200, true, 'Danh sách phòng đã xem', { rooms })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
