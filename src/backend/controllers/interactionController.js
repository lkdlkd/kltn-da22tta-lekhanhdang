const Interaction = require('../models/Interaction')
const sendResponse = require('../utils/apiResponse')

/**
 * Giới hạn số interaction mỗi user mỗi loại.
 * Khi vượt quá → xóa các bản ghi cũ nhất để giữ kho dữ liệu gọn.
 *   view : 100 lần gần nhất (dùng phân tích nội dung phòng đã xem)
 *   save : 50  lần gần nhất (intent mạnh hơn view)
 */
const MAX_PER_TYPE = { view: 100, save: 50 }

/**
 * Hàm nội bộ: ghi interaction + trim nếu vượt giới hạn.
 * Dùng chung bởi createInteraction và favoriteController.
 */
async function recordInteraction(userId, roomId, type) {
  const max = MAX_PER_TYPE[type] ?? 50

  // Tạo bản ghi mới
  await Interaction.create({ user: userId, room: roomId, type })

  // Đếm tổng của loại này cho user
  const count = await Interaction.countDocuments({ user: userId, type })
  if (count > max) {
    // Xóa (count - max) bản ghi cũ nhất
    const excess = count - max
    const oldest = await Interaction.find({ user: userId, type })
      .sort({ createdAt: 1 })
      .limit(excess)
      .select('_id')
    await Interaction.deleteMany({ _id: { $in: oldest.map(d => d._id) } })
  }
}
exports.recordInteraction = recordInteraction

// POST /api/interactions
exports.createInteraction = async (req, res) => {
  try {
    const { roomId, type } = req.body
    if (!roomId || !type) return sendResponse(res, 400, false, 'Thiếu roomId hoặc type')

    // Không duplicate view trong 1 giờ
    if (type === 'view') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const existing = await Interaction.findOne({
        user: req.user._id, room: roomId, type: 'view',
        createdAt: { $gte: oneHourAgo },
      })
      if (existing) return sendResponse(res, 200, true, 'Already tracked')
    }

    await recordInteraction(req.user._id, roomId, type)
    return sendResponse(res, 201, true, 'Ghi nhận tương tác thành công')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

/**
 * GET /api/interactions/recently-viewed
 * Trả về phòng gần nhất user đã VIEW hoặc SAVE (deduplicated).
 * 'save' có ưu tiên hiển thị vì intent mạnh hơn.
 */
exports.getRecentlyViewed = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 20)

    // Lấy cả view + save, sort gần nhất
    const interactions = await Interaction.find({
      user: req.user._id,
      type: { $in: ['view', 'save'] },
    })
      .sort({ createdAt: -1 })
      .populate({ path: 'room', select: 'title slug images price area roomType location isAvailable', populate: { path: 'landlord', select: 'name' } })
      .limit(limit * 4) // lấy dư để deduplicate

    // Deduplicate theo room ID (giữ lần xuất hiện gần nhất)
    const seen = new Set()
    const rooms = []
    for (const inter of interactions) {
      if (!inter.room) continue
      const id = String(inter.room._id)
      if (!seen.has(id)) { seen.add(id); rooms.push(inter.room) }
      if (rooms.length >= limit) break
    }
    return sendResponse(res, 200, true, 'Danh sách phòng đã xem/lưu', { rooms })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
