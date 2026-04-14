const mongoose = require('mongoose')
const Review = require('../models/Review')
const sendResponse = require('../utils/apiResponse')

// POST /api/rooms/:id/reviews
exports.createReview = async (req, res) => {
  try {
    const { rating, content } = req.body
    if (!rating || !content) return sendResponse(res, 400, false, 'Thiếu rating hoặc nội dung')
    if (rating < 1 || rating > 5) return sendResponse(res, 400, false, 'Rating phải từ 1 đến 5')

    const review = await Review.create({
      room: req.params.id,
      user: req.user._id,
      rating: Number(rating),
      content: content.trim(),
    })
    return sendResponse(res, 201, true, 'Đánh giá đã được gửi và đang chờ duyệt', { review })
  } catch (error) {
    if (error.code === 11000) return sendResponse(res, 409, false, 'Bạn đã đánh giá phòng này rồi')
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/rooms/:id/reviews
exports.getRoomReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ room: req.params.id, status: 'approved' })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })

    // Rating distribution
    const distribution = await Review.aggregate([
      { $match: { room: new mongoose.Types.ObjectId(req.params.id), status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ])
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    distribution.forEach((d) => { dist[d._id] = d.count })

    return sendResponse(res, 200, true, 'Danh sách đánh giá', { reviews, distribution: dist })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/reviews/:id
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) return sendResponse(res, 404, false, 'Không tìm thấy đánh giá')
    if (String(review.user) !== String(req.user._id))
      return sendResponse(res, 403, false, 'Bạn không có quyền chỉnh sửa đánh giá này')

    const { rating, content } = req.body
    if (rating) review.rating = Number(rating)
    if (content) review.content = content.trim()
    review.status = 'pending' // gửi lại để duyệt
    await review.save()
    return sendResponse(res, 200, true, 'Đã cập nhật đánh giá, đang chờ duyệt lại', { review })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// DELETE /api/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) return sendResponse(res, 404, false, 'Không tìm thấy đánh giá')
    const isOwner = String(review.user) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendResponse(res, 403, false, 'Không có quyền xoá đánh giá này')

    await Review.findByIdAndDelete(req.params.id)
    return sendResponse(res, 200, true, 'Đã xoá đánh giá')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// ── Admin ──────────────────────────────────────────────────────────────
// GET /api/admin/reviews
exports.adminGetReviews = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const query = {}
    if (req.query.status) query.status = req.query.status

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'name email avatar')
        .populate('room', 'title slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments(query),
    ])
    return sendResponse(res, 200, true, 'Danh sách đánh giá', {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/reviews/:id/approve
exports.adminApproveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true })
    if (!review) return sendResponse(res, 404, false, 'Không tìm thấy đánh giá')
    return sendResponse(res, 200, true, 'Đã duyệt đánh giá', { review })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/admin/reviews/:id/reject
exports.adminRejectReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true })
    if (!review) return sendResponse(res, 404, false, 'Không tìm thấy đánh giá')
    return sendResponse(res, 200, true, 'Đã từ chối đánh giá', { review })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// DELETE /api/admin/reviews/:id
exports.adminDeleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id)
    if (!review) return sendResponse(res, 404, false, 'Không tìm thấy đánh giá')
    return sendResponse(res, 200, true, 'Đã xoá đánh giá', {})
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
