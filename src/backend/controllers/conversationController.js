const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const mongoose = require('mongoose')
const sendResponse = require('../utils/apiResponse')

// GET /api/conversations
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name avatar role')
      .populate({ path: 'lastMessage', select: 'content createdAt isRead sender' })
      .populate('room', 'title slug images')
      .sort({ lastMessageAt: -1 })
    return sendResponse(res, 200, true, 'Danh sách cuộc hội thoại', { conversations })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// POST /api/conversations
exports.createConversation = async (req, res) => {
  try {
    const { recipientId, roomId } = req.body
    if (!recipientId) return sendResponse(res, 400, false, 'Thiếu recipientId')
    if (String(recipientId) === String(req.user._id))
      return sendResponse(res, 400, false, 'Không thể tạo cuộc hội thoại với chính mình')

    // Validate roomId — nếu không phải ObjectId hợp lệ thì bỏ qua
    const validRoomId = roomId && mongoose.isValidObjectId(roomId) ? roomId : null

    // Tìm conversation đã có giữa 2 user (có thể liên quan đến cùng 1 phòng)
    const query = { participants: { $all: [req.user._id, recipientId] } }
    if (validRoomId) query.room = validRoomId

    let conversation = await Conversation.findOne(query)
      .populate('participants', 'name avatar role')
      .populate('room', 'title slug images')

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
        room: validRoomId || null,
      })
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name avatar role')
        .populate('room', 'title slug images')
    }

    return sendResponse(res, 200, true, 'OK', { conversation })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/conversations/:id/messages
exports.getMessages = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id)
    if (!conv) return sendResponse(res, 404, false, 'Không tìm thấy cuộc hội thoại')
    if (!conv.participants.map(String).includes(String(req.user._id)))
      return sendResponse(res, 403, false, 'Không có quyền truy cập')

    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 30, 100)
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .populate({
        path: 'appointmentRef',
        populate: { path: 'room', select: 'title slug images' },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    // Đánh dấu đã đọc các tin nhắn của người kia
    await Message.updateMany(
      { conversation: req.params.id, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    )

    // Cập nhật unread_count qua socket
    const emitUnreadCount = req.app.get('emitUnreadCount')
    if (emitUnreadCount) emitUnreadCount(String(req.user._id)).catch(() => {})

    return sendResponse(res, 200, true, 'Lịch sử tin nhắn', {
      messages: messages.reverse(), // trả về theo thứ tự thời gian
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/conversations/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    // Tìm các conversation của user
    const convIds = (await Conversation.find({ participants: req.user._id }).select('_id')).map((c) => c._id)
    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: req.user._id },
      isRead: false,
    })
    return sendResponse(res, 200, true, 'OK', { count })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// POST /api/conversations/upload-media — upload ảnh/video cho chat
exports.uploadChatMedia = async (req, res) => {
  try {
    const { uploadBufferToCloudinary } = require('../services/cloudinaryService')
    const files = req.files || []
    if (!files.length) return sendResponse(res, 400, false, 'Không có file nào được gửi lên')

    const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif']

    const results = await Promise.all(
      files.map(async (file) => {
        const isImage = imageMimes.includes(file.mimetype)
        const resourceType = isImage ? 'image' : 'video'
        const result = await uploadBufferToCloudinary(file.buffer, 'chat/media', resourceType)
        return { url: result.secure_url, type: resourceType }
      })
    )

    return sendResponse(res, 200, true, 'Upload thành công', { attachments: results })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
