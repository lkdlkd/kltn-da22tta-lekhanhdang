const express = require('express')
const { authenticate, authorize } = require('../middlewares/auth')
const { createComment, getRoomComments, deleteComment } = require('../controllers/commentController')

const router = express.Router()

// Public — xem bình luận đã duyệt
router.get('/room/:id', getRoomComments)

// Auth required
router.post('/room/:id', authenticate, createComment)
router.delete('/:id', authenticate, deleteComment)

module.exports = router
