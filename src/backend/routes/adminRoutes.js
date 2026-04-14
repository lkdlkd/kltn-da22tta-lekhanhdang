const express = require('express')
const { authenticate, authorize } = require('../middlewares/auth')
const {
  adminGetRooms, adminApproveRoom, adminRejectRoom,
  adminHideRoom, adminDeleteRoom, adminRestoreRoom,
  adminGetUsers, adminBanUser, adminUnbanUser,
  adminGetStats,
} = require('../controllers/adminController')
const { adminGetReviews, adminApproveReview, adminRejectReview, adminDeleteReview } = require('../controllers/reviewController')

const router = express.Router()
router.use(authenticate, authorize('admin'))

router.get('/stats', adminGetStats)

router.get('/rooms', adminGetRooms)
router.put('/rooms/:id/approve', adminApproveRoom)
router.put('/rooms/:id/reject', adminRejectRoom)
router.put('/rooms/:id/hide', adminHideRoom)
router.put('/rooms/:id/restore', adminRestoreRoom)
router.delete('/rooms/:id', adminDeleteRoom)

router.get('/users', adminGetUsers)
router.put('/users/:id/ban', adminBanUser)
router.put('/users/:id/unban', adminUnbanUser)

router.get('/reviews', adminGetReviews)
router.put('/reviews/:id/approve', adminApproveReview)
router.put('/reviews/:id/reject', adminRejectReview)
router.delete('/reviews/:id', adminDeleteReview)

module.exports = router
