const Room = require('../models/Room')
const User = require('../models/User')
const sendResponse = require('../utils/apiResponse')
const { createNotification } = require('./notificationController')

// GET /api/admin/rooms
exports.adminGetRooms = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const query = {}
    if (req.query.status) query.status = req.query.status
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i')
      query.$or = [{ title: re }, { address: re }]
    }

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .populate('landlord', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Room.countDocuments(query),
    ])
    return sendResponse(res, 200, true, 'Danh sách phòng', {
      rooms,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/rooms/:id/approve
exports.adminApproveRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true })
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    // Gửi thông báo cho chủ trọ
    await createNotification({
      userId: room.landlord,
      type: 'room_approved',
      title: 'Phòng đã được duyệt',
      body: `Phòng "${room.title}" của bạn đã được admin duyệt và hiển thị công khai.`,
      link: `/rooms/${room.slug}`,
      io: req.app.get('io'),
    })
    return sendResponse(res, 200, true, 'Đã duyệt phòng', { room })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/rooms/:id/reject
exports.adminRejectRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true })
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    await createNotification({
      userId: room.landlord,
      type: 'room_rejected',
      title: 'Phòng bị từ chối',
      body: `Phòng "${room.title}" của bạn đã bị admin từ chối. Lý do: ${req.body.reason || 'Vi phạm quy định.'}`,
      link: `/landlord/rooms/${room._id}/edit`,
      io: req.app.get('io'),
    })
    return sendResponse(res, 200, true, 'Đã từ chối phòng', { room })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/rooms/:id/hide — Ẩn phòng vi phạm (giữ data, không đổi isAvailable)
exports.adminHideRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { status: 'flagged' },   // chỉ ẩn, KHÔNG đổi isAvailable
      { new: true }
    )
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    await createNotification({
      userId: room.landlord,
      type: 'system',
      title: '⚠️ Phòng bị ẩn',
      body: `Phòng "${room.title}" đã bị ẩn khỏi danh sách tìm kiếm công khai. Lý do: ${req.body.reason || 'Vi phạm nội quy.'}`,
      link: '/landlord/rooms',
      io: req.app.get('io'),
    })
    return sendResponse(res, 200, true, 'Đã ẩn phòng', { room })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/rooms/:id/restore — Khôi phục phòng flagged về approved
exports.adminRestoreRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    )
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    await createNotification({
      userId: room.landlord,
      type: 'room_approved',
      title: '✅ Phòng đã được khôi phục',
      body: `Phòng "${room.title}" đã được admin duyệt lại và hiển thị công khai trở lại.`,
      link: `/rooms/${room.slug}`,
      io: req.app.get('io'),
    })
    return sendResponse(res, 200, true, 'Đã khôi phục phòng', { room })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// DELETE /api/admin/rooms/:id — Xóa hẳn phòng
exports.adminDeleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    const landlordId = room.landlord
    const roomTitle = room.title
    await Room.findByIdAndDelete(req.params.id)

    await createNotification({
      userId: landlordId,
      type: 'system',
      title: '🗑️ Phòng bị xóa',
      body: `Phòng "${roomTitle}" đã bị admin xóa khỏi hệ thống. Lý do: ${req.body.reason || 'Vi phạm nghiêm trọng.'}`,
      link: '/landlord/rooms',
      io: req.app.get('io'),
    })
    return sendResponse(res, 200, true, 'Đã xóa phòng', {})
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/admin/users
exports.adminGetUsers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const query = {}
    if (req.query.role) query.role = req.query.role
    if (req.query.isBanned !== undefined && req.query.isBanned !== '') query.isBanned = req.query.isBanned === 'true'
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i')
      query.$or = [{ name: re }, { email: re }, { phone: re }]
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ])
    return sendResponse(res, 200, true, 'Danh sách người dùng', {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/users/:id/ban
exports.adminBanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true }).select('-password')
    if (!user) return sendResponse(res, 404, false, 'Không tìm thấy người dùng')
    return sendResponse(res, 200, true, 'Đã khoá tài khoản', { user })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/users/:id/unban
exports.adminUnbanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false }, { new: true }).select('-password')
    if (!user) return sendResponse(res, 404, false, 'Không tìm thấy người dùng')
    return sendResponse(res, 200, true, 'Đã mở khoá tài khoản', { user })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/admin/stats
exports.adminGetStats = async (req, res) => {
  try {
    const Review = require('../models/Review')
    const [totalRooms, pendingRooms, totalUsers, pendingReviews, topRooms, monthlyData] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'pending' }),
      User.countDocuments(),
      Review.countDocuments({ status: 'pending' }),
      Room.find({ status: 'approved' }).sort({ viewCount: -1 }).limit(5).select('title slug viewCount images price'),
      // 12 tháng gần nhất
      Room.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ])

    return sendResponse(res, 200, true, 'Thống kê hệ thống', {
      totalRooms, pendingRooms, totalUsers, pendingReviews, topRooms, monthlyData,
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
