const multer = require('multer')
const sendResponse = require('../utils/apiResponse')
const { uploadBufferToCloudinary } = require('../services/cloudinaryService')

const storage = multer.memoryStorage()

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']

const fileFilter = (req, file, cb) => {
  if (!imageMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)'))
  }
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 20,
  },
})

const parseMaybeJsonArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch (error) {
    // Ignore parse error and fallback to comma-separated parser.
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const uploadRoomImagesToCloudinary = async (req, res, next) => {
  try {
    const imageFiles = req.files?.images || []
    const image360Files = req.files?.images360 || []

    const uploadedImages = await Promise.all(
      imageFiles.map((file) => uploadBufferToCloudinary(file.buffer, 'rooms/images'))
    )

    const uploadedImages360 = await Promise.all(
      image360Files.map((file) => uploadBufferToCloudinary(file.buffer, 'rooms/images360'))
    )

    const bodyImages = parseMaybeJsonArray(req.body.images)
    const bodyImages360 = parseMaybeJsonArray(req.body.images360)

    req.body.images = [
      ...bodyImages,
      ...uploadedImages.map((item) => item.secure_url),
    ]

    req.body.images360 = [
      ...bodyImages360,
      ...uploadedImages360.map((item) => item.secure_url),
    ]

    next()
  } catch (error) {
    return sendResponse(res, 500, false, 'Upload ảnh thất bại', null, error.message)
  }
}

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return sendResponse(res, 400, false, `Lỗi upload: ${err.message}`)
  }

  if (err) {
    return sendResponse(res, 400, false, err.message)
  }

  next()
}

module.exports = {
  uploadRoomImages: upload.fields([
    { name: 'images', maxCount: 12 },
    { name: 'images360', maxCount: 8 },
  ]),
  uploadRoomImagesToCloudinary,
  handleUploadError,
}
