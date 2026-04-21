const cloudinary = require('cloudinary').v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadBufferToCloudinary = (buffer, folder = 'rooms', resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Xóa file trên Cloudinary dựa vào URL.
 * URL format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<id>.<ext>
 * @param {string} url  - Cloudinary secure_url
 * @param {'image'|'video'|'raw'} resourceType
 */
const deleteFromCloudinary = async (url, resourceType = 'image') => {
  if (!url || !url.includes('cloudinary.com')) return

  try {
    // Lấy phần sau "/upload/"
    const parts = url.split('/upload/')
    if (parts.length < 2) return

    let path = parts[1]
    // Bỏ version prefix: v1234567890/
    path = path.replace(/^v\d+\//, '')
    // Bỏ extension (.jpg, .mp4, ...)
    const publicId = path.replace(/\.[^/.]+$/, '')

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (err) {
    // Không để lỗi Cloudinary block luồng chính
    console.warn('[Cloudinary] deleteFromCloudinary error:', err?.message || err)
  }
}

module.exports = {
  cloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
}
