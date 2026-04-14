const Comment = require('../models/Comment')
const sendResponse = require('../utils/apiResponse')

// POST /api/comments/room/:id
exports.createComment = async (req, res) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return sendResponse(res, 400, false, 'Nội dung bình luận không được rỗng')
    if (content.trim().length < 2) return sendResponse(res, 400, false, 'Bình luận quá ngắn')

    const comment = await Comment.create({
      room:    req.params.id,
      user:    req.user._id,
      content: content.trim(),
    })
    const populated = await comment.populate('user', 'name avatar')
    return sendResponse(res, 201, true, 'Bình luận đã được gửi và đang chờ duyệt', { comment: populated })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/comments/room/:id
exports.getRoomComments = async (req, res) => {
  try {
    const comments = await Comment.find({ room: req.params.id, status: 'approved' })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
    return sendResponse(res, 200, true, 'Danh sách bình luận', { comments })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// DELETE /api/comments/:id
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
    if (!comment) return sendResponse(res, 404, false, 'Không tìm thấy bình luận')

    const isOwner = String(comment.user) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendResponse(res, 403, false, 'Không có quyền xoá bình luận này')

    await Comment.findByIdAndDelete(req.params.id)
    return sendResponse(res, 200, true, 'Đã xoá bình luận')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// ── Admin ────────────────────────────────────────────────────────────────

// GET /api/admin/comments
exports.adminGetComments = async (req, res) => {
  try {
    const page  = Math.max(Number(req.query.page)  || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const query = {}
    if (req.query.status) query.status = req.query.status

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('user', 'name email avatar')
        .populate('room', 'title slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Comment.countDocuments(query),
    ])
    return sendResponse(res, 200, true, 'Danh sách bình luận', {
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/comments/:id/approve
exports.adminApproveComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true })
    if (!comment) return sendResponse(res, 404, false, 'Không tìm thấy bình luận')
    return sendResponse(res, 200, true, 'Đã duyệt bình luận', { comment })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/comments/:id/reject
exports.adminRejectComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true })
    if (!comment) return sendResponse(res, 404, false, 'Không tìm thấy bình luận')
    return sendResponse(res, 200, true, 'Đã từ chối bình luận', { comment })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// DELETE /api/admin/comments/:id
exports.adminDeleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id)
    if (!comment) return sendResponse(res, 404, false, 'Không tìm thấy bình luận')
    return sendResponse(res, 200, true, 'Đã xoá bình luận')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
