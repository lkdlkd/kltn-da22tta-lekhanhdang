const express = require('express')
const { authenticate } = require('../middlewares/auth')
const { getNotifications, markOneRead, markAllRead } = require('../controllers/notificationController')

const router = express.Router()

router.use(authenticate)
router.get('/', getNotifications)
router.put('/read-all', markAllRead)
router.put('/:id/read', markOneRead)

module.exports = router
