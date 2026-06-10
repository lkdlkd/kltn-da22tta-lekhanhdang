const express = require('express')
const { getSimilarRooms, wizardRecommend, forYouRecommend, getCommunityRecommend } = require('../controllers/recommendController')
const { authenticate } = require('../middlewares/auth')

const router = express.Router()

// API 1 — Phòng tương tự phòng đang xem (public, không cần login)
// GET /api/recommend/similar/:id?limit=6
router.get('/similar/:id', getSimilarRooms)

// API 2 — Wizard theo tiêu chí tìm kiếm (public, không cần login)
// POST /api/recommend/wizard
router.post('/wizard', wizardRecommend)

// API 3 — Gợi ý cá nhân hóa theo hành vi (bắt buộc đăng nhập)
// POST /api/recommend/for-you
router.post('/for-you', authenticate, forYouRecommend)

// API 4 — Gợi ý dựa trên hoạt động cộng đồng (public, không cần login)
// GET /api/recommend/community
router.get('/community', getCommunityRecommend)

module.exports = router
