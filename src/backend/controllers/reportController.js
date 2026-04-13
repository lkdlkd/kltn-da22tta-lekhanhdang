const Report = require('../models/Report')
const Room = require('../models/Room')
const sendResponse = require('../utils/apiResponse')
const { createNotification } = require('./notificationController')

const REASON_LABELS = {
  fake_info: 'Thông tin sai lệch',
  wrong_price: 'Giá không đúng',
  fake_images: 'Ảnh giả mạo',
  spam: 'Spam / Quảng cáo',
  other: 'Lý do khác',
}

// POST /api/rooms/:id/report
exports.createReport = async (req, res) => {
  try {
    const { reason, description } = req.body
    if (!reason) return sendResponse(res, 400, false, 'Vui lòng chọn lý do báo cáo')

    const room = await Room.findById(req.params.id)
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    const report = await Report.create({
      room: req.params.id,
      reportedBy: req.user._id,
      reason,
      description: description?.trim() || '',
    })

    // Auto-flag: phòng bị report >= 5 lần → flagged
    const reportCount = await Report.countDocuments({ room: req.params.id })
    if (reportCount >= 5 && room.status !== 'flagged') {
      await Room.findByIdAndUpdate(req.params.id, { status: 'flagged' })
      // Notify admin (broadcast — không có userId cụ thể nên emit to 'admins' room)
      const io = req.app.get('io')
      if (io) io.to('admins').emit('room_flagged', { room: room.title, reportCount })
    }

    return sendResponse(res, 201, true, 'Báo cáo đã được ghi nhận', { report })
  } catch (error) {
    if (error.code === 11000) return sendResponse(res, 409, false, 'Bạn đã báo cáo phòng này rồi')
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/reports/room/:id/status — check xem user đã report chưa
exports.getMyReportStatus = async (req, res) => {
  try {
    const existing = await Report.findOne({ room: req.params.id, reportedBy: req.user._id })
    return sendResponse(res, 200, true, 'OK', { hasReported: Boolean(existing) })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/admin/reports
exports.adminGetReports = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const query = {}
    if (req.query.status) query.status = req.query.status
    if (req.query.reason) query.reason = req.query.reason

    // Aggregate to include report count per room
    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('room', 'title slug images status')
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Report.countDocuments(query),
    ])

    return sendResponse(res, 200, true, 'Danh sách báo cáo', {
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/reports/:id/resolve
exports.adminResolveReport = async (req, res) => {
  try {
    const { action } = req.body // 'dismiss' | 'hide_room' | 'remove_room'
    const report = await Report.findById(req.params.id).populate('room')
    if (!report) return sendResponse(res, 404, false, 'Không tìm thấy báo cáo')

    report.status = 'resolved'
    report.resolvedAction = action
    report.resolvedAt = new Date()
    await report.save()

    if (action === 'hide_room' && report.room) {
      // Ẩn phòng (giữ data, không hiển thị công khai)
      await Room.findByIdAndUpdate(report.room._id, { status: 'flagged' })
      // Thông báo cho chủ trọ
      await createNotification({
        userId: report.room.landlord,
        type: 'system',
        title: '⚠️ Phòng bị ẩn do vi phạm',
        body: `Phòng "${report.room.title}" đã bị ẩn khỏi danh sách vì nhận nhiều báo cáo vi phạm. Vui lòng liên hệ admin để được hỗ trợ.`,
        link: '/landlord/rooms',
        io: req.app.get('io'),
      })
      // Đánh dấu toàn bộ report của phòng này là resolved
      await Report.updateMany({ room: report.room._id, status: { $ne: 'resolved' } }, { status: 'resolved' })
    }

    if (action === 'remove_room' && report.room) {
      // Xóa hẳn phòng
      await Room.findByIdAndDelete(report.room._id)
      await createNotification({
        userId: report.room.landlord,
        type: 'system',
        title: '🗑️ Phòng bị xóa do vi phạm',
        body: `Phòng "${report.room.title}" đã bị xóa khỏi hệ thống vì vi phạm nghiêm trọng.`,
        link: '/landlord/rooms',
        io: req.app.get('io'),
      })
      await Report.updateMany({ room: report.room._id, status: { $ne: 'resolved' } }, { status: 'resolved' })
    }

    return sendResponse(res, 200, true, 'Đã xử lý báo cáo', { report })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

