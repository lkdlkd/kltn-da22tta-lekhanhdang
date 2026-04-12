const Notification = require('../models/Notification')
const sendResponse = require('../utils/apiResponse')

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ])
    return sendResponse(res, 200, true, 'Danh sách thông báo', {
      notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/notifications/:id/read
exports.markOneRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true }
    )
    return sendResponse(res, 200, true, 'Đã đánh dấu đã đọc')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true })
    return sendResponse(res, 200, true, 'Đã đánh dấu tất cả đã đọc')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// Helper: tạo notification và emit qua socket
exports.createNotification = async ({ userId, type, title, body, link, io }) => {
  try {
    const notification = await Notification.create({ user: userId, type, title, body, link })
    if (io) {
      io.to(`user:${userId}`).emit('new_notification', notification)
    }
    return notification
  } catch (error) {
    console.error('createNotification error:', error.message)
  }
}
