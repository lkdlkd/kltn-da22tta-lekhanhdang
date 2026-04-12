const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { uploadBufferToCloudinary } = require('../services/cloudinaryService')
const sendResponse = require('../utils/apiResponse')

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -emailVerifyToken -emailVerifyTokenExpires -passwordResetToken -passwordResetTokenExpires')
    if (!user) return sendResponse(res, 404, false, 'Không tìm thấy người dùng')
    return sendResponse(res, 200, true, 'Hồ sơ người dùng', { user })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, preferences } = req.body
    const updateData = {}
    if (name?.trim()) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (preferences) {
      try {
        updateData.preferences = typeof preferences === 'string' ? JSON.parse(preferences) : preferences
      } catch { /* ignore parse error */ }
    }

    // Upload avatar nếu có file (buffer từ multer memoryStorage)
    if (req.file?.buffer) {
      const result = await uploadBufferToCloudinary(req.file.buffer, 'avatars')
      updateData.avatar = result.secure_url
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true })
      .select('-password -emailVerifyToken -passwordResetToken')

    return sendResponse(res, 200, true, 'Cập nhật hồ sơ thành công', { user })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/users/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return sendResponse(res, 400, false, 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới')
    if (newPassword.length < 6) return sendResponse(res, 400, false, 'Mật khẩu mới phải có ít nhất 6 ký tự')

    const user = await User.findById(req.user._id).select('+password')
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) return sendResponse(res, 400, false, 'Mật khẩu hiện tại không đúng')

    user.password = newPassword
    await user.save()
    return sendResponse(res, 200, true, 'Đổi mật khẩu thành công')
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
