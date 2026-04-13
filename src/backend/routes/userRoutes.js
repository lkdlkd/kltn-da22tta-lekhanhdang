const express = require('express')
const { authenticate } = require('../middlewares/auth')
const { getProfile, updateProfile, changePassword, getPublicProfile } = require('../controllers/userController')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = express.Router()

// Public — không cần đăng nhập
router.get('/:username/public', getPublicProfile)

// Protected — cần đăng nhập
router.use(authenticate)
router.get('/profile', getProfile)
router.put('/profile', upload.single('avatar'), updateProfile)
router.put('/change-password', changePassword)

module.exports = router
