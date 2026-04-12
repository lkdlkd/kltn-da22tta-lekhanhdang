const Room = require('../models/Room')
const sendResponse = require('../utils/apiResponse')

// POST /api/rooms/compare
exports.compareRooms = async (req, res) => {
  try {
    const { roomIds, lat, lng } = req.body
    if (!Array.isArray(roomIds) || roomIds.length < 2 || roomIds.length > 3) {
      return sendResponse(res, 400, false, 'Cần từ 2 đến 3 phòng để so sánh')
    }

    const rooms = await Room.find({ _id: { $in: roomIds } })
      .populate('landlord', 'name phone')

    if (rooms.length === 0) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    // Tính khoảng cách nếu có tọa độ
    let roomsWithDistance = rooms.map((room) => {
      const obj = room.toObject()
      if (lat && lng && room.location?.coordinates?.length === 2) {
        const [rLng, rLat] = room.location.coordinates
        const R = 6371
        const dLat = ((rLat - lat) * Math.PI) / 180
        const dLon = ((rLng - lng) * Math.PI) / 180
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) * Math.cos((rLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
        const distance_km = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
        obj.distance_km = distance_km
      }
      return obj
    })

    // Sắp xếp theo thứ tự roomIds gốc
    roomsWithDistance = roomIds
      .map((id) => roomsWithDistance.find((r) => String(r._id) === String(id)))
      .filter(Boolean)

    return sendResponse(res, 200, true, 'So sánh phòng thành công', { rooms: roomsWithDistance })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
