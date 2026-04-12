const Favorite = require('../models/Favorite')
const Room = require('../models/Room')
const sendResponse = require('../utils/apiResponse')

// POST /api/favorites/:roomId
exports.addFavorite = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    await Favorite.create({ user: req.user._id, room: req.params.roomId })
    return sendResponse(res, 201, true, 'Đã lưu phòng yêu thích')
  } catch (error) {
    if (error.code === 11000) return sendResponse(res, 409, false, 'Bạn đã lưu phòng này rồi')
    return sendResponse(res, 500, false, error.message)
  }
}

// DELETE /api/favorites/:roomId
exports.removeFavorite = async (req, res) => {
  try {
    const result = await Favorite.findOneAndDelete({ user: req.user._id, room: req.params.roomId })
    if (!result) return sendResponse(res, 404, false, 'Chưa lưu phòng này')
    return sendResponse(res, 200, true, 'Đã bỏ yêu thích')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/favorites
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate({
        path: 'room',
        populate: { path: 'landlord', select: 'name email phone' },
      })
      .sort({ createdAt: -1 })

    const rooms = favorites.map((f) => f.room).filter(Boolean)
    return sendResponse(res, 200, true, 'Danh sách phòng yêu thích', { rooms })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/favorites/ids — trả về mảng roomIds để FE check trạng thái (không auth required check)
exports.getFavoriteIds = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).select('room')
    const roomIds = favorites.map((f) => String(f.room))
    return sendResponse(res, 200, true, 'OK', { roomIds })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
