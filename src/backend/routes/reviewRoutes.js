const express = require('express')
const { authenticate, authorize } = require('../middlewares/auth')
const {
  createReview, getRoomReviews, updateReview, deleteReview,
  adminGetReviews, adminApproveReview, adminRejectReview,
} = require('../controllers/reviewController')

const router = express.Router()

// Public
router.get('/room/:id', getRoomReviews)

// Auth required
router.post('/room/:id', authenticate, authorize('student'), createReview)
router.put('/:id', authenticate, updateReview)
router.delete('/:id', authenticate, deleteReview)

// Admin
router.get('/admin', authenticate, authorize('admin'), adminGetReviews)
router.put('/admin/:id/approve', authenticate, authorize('admin'), adminApproveReview)
router.put('/admin/:id/reject', authenticate, authorize('admin'), adminRejectReview)

module.exports = router
