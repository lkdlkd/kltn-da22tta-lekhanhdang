const express = require('express')
const multer = require('multer')
const { authenticate } = require('../middlewares/auth')
const {
  getConversations, createConversation,
  getMessages, getUnreadCount, uploadChatMedia, markRead,
} = require('../controllers/conversationController')

const router = express.Router()
router.use(authenticate)

// ── Conversation & Messages ──────────────────────────────────────────────
router.get('/', getConversations)
router.post('/', createConversation)
router.get('/unread-count', getUnreadCount)
router.get('/:id/messages', getMessages)
router.patch('/:id/read', markRead)

// ── Media Upload for Chat ────────────────────────────────────────────────
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    ]
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File không hợp lệ'))
  },
})
router.post('/upload-media', upload.array('files', 5), uploadChatMedia)

module.exports = router
