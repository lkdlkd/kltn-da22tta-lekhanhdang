const express = require('express')
const { getSimilarRooms, wizardRecommend } = require('../controllers/recommendController')

const router = express.Router()

// GET /api/recommend/similar/:id?limit=6
router.get('/similar/:id', getSimilarRooms)

// POST /api/recommend/wizard
router.post('/wizard', wizardRecommend)

module.exports = router
