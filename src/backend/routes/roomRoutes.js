const express = require('express')
const { authenticate, authorize, authenticateOptional } = require('../middlewares/auth')
const {
	uploadRoomImages,
	uploadRoomImagesToCloudinary,
	handleUploadError,
} = require('../middlewares/uploadRoomImages')
const {
	createRoom,
	getRooms,
	getMyRooms,
	getRoomBySlug,
	getRoomById,
	updateRoom,
	deleteRoom,
	getDistanceToRoom,
	getNearbyRooms,
} = require('../controllers/roomController')

const router = express.Router()

router.get('/', getRooms)
router.get('/slug/:slug', authenticateOptional, getRoomBySlug)
router.get('/nearby', getNearbyRooms)
router.get('/my-rooms', authenticate, authorize('landlord', 'admin'), getMyRooms)
router.get('/:id/distance', getDistanceToRoom)
router.get('/:id', authenticateOptional, getRoomById)

router.post(
	'/',
	authenticate,
	authorize('landlord', 'admin'),
	uploadRoomImages,
	handleUploadError,
	uploadRoomImagesToCloudinary,
	createRoom
)

router.put(
	'/:id',
	authenticate,
	authorize('landlord', 'admin'),
	uploadRoomImages,
	handleUploadError,
	uploadRoomImagesToCloudinary,
	updateRoom
)

router.delete('/:id', authenticate, authorize('landlord', 'admin'), deleteRoom)

module.exports = router
