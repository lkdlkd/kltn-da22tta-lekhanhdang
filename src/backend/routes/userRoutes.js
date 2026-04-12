const express = require('express')
const { authenticate } = require('../middlewares/auth')
const { getProfile, updateProfile, changePassword } = require('../controllers/userController')
// Dùng multer đơn giản cho avatar upload (không cần uploadRoomImages)
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = express.Router()

router.use(authenticate)
router.get('/profile', getProfile)
router.put('/profile', upload.single('avatar'), updateProfile)
router.put('/change-password', changePassword)

module.exports = router
