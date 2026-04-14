const multer = require('multer')
const sendResponse = require('../utils/apiResponse')
const { uploadBufferToCloudinary } = require('../services/cloudinaryService')

const storage = multer.memoryStorage()

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const videoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

const fileFilter = (req, file, cb) => {
  if ([...imageMimeTypes, ...videoMimeTypes].includes(file.mimetype)) {
    return cb(null, true)
  }
  return cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp) hoặc video (mp4, mov, avi, webm)'))
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (videos can be large)
    files: 25,
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
    const videoFiles = req.files?.videos || []

    const uploadedImages = await Promise.all(
      imageFiles.map((file) => uploadBufferToCloudinary(file.buffer, 'rooms/images', 'image'))
    )

    const uploadedImages360 = await Promise.all(
      image360Files.map((file) => uploadBufferToCloudinary(file.buffer, 'rooms/images360', 'image'))
    )

    const uploadedVideos = await Promise.all(
      videoFiles.map((file) => uploadBufferToCloudinary(file.buffer, 'rooms/videos', 'video'))
    )

    const bodyImages = parseMaybeJsonArray(req.body.images)
    const bodyImages360 = parseMaybeJsonArray(req.body.images360)
    const bodyVideos = parseMaybeJsonArray(req.body.videos)

    req.body.images = [
      ...bodyImages,
      ...uploadedImages.map((item) => item.secure_url),
    ]

    req.body.images360 = [
      ...bodyImages360,
      ...uploadedImages360.map((item) => item.secure_url),
    ]

    req.body.videos = [
      ...bodyVideos,
      ...uploadedVideos.map((item) => item.secure_url),
    ]

    next()
  } catch (error) {
    return sendResponse(res, 500, false, 'Upload file thất bại', null, error.message)
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
    { name: 'videos', maxCount: 3 },
  ]),
  uploadRoomImagesToCloudinary,
  handleUploadError,
}
