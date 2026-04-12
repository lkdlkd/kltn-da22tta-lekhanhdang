const express = require('express')
const { authenticate } = require('../middlewares/auth')
const { createInteraction, getRecentlyViewed } = require('../controllers/interactionController')

const router = express.Router()

router.use(authenticate)
router.post('/', createInteraction)
router.get('/recently-viewed', getRecentlyViewed)

module.exports = router
