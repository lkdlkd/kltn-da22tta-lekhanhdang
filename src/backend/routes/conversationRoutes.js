const express = require('express')
const { authenticate } = require('../middlewares/auth')
const { getConversations, createConversation, getMessages, getUnreadCount } = require('../controllers/conversationController')

const router = express.Router()

router.use(authenticate)
router.get('/', getConversations)
router.post('/', createConversation)
router.get('/unread-count', getUnreadCount)
router.get('/:id/messages', getMessages)

module.exports = router
