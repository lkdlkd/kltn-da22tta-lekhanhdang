const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService')
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

    // Upload avatar nếu có file mới — xóa avatar cũ trước
    if (req.file?.buffer) {
      // Lấy user hiện tại để biết avatar cũ
      const currentUser = await User.findById(req.user._id).select('avatar')
      if (currentUser?.avatar && currentUser.avatar.includes('cloudinary.com')) {
        await deleteFromCloudinary(currentUser.avatar, 'image')
      }

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

// GET /api/users/:username/public  — Hồ sơ công khai của chủ trọ + danh sách phòng
exports.getPublicProfile = async (req, res) => {
  try {
    const Room = require('../models/Room')
    const { username } = req.params

    const user = await User.findOne({ username }).select('name username avatar phone role createdAt')
    if (!user) return sendResponse(res, 404, false, 'Không tìm thấy chủ trọ')
    if (user.role !== 'landlord') return sendResponse(res, 403, false, 'Người dùng này không phải chủ trọ')

    const rooms = await Room.find({ landlord: user._id, status: 'approved' })
      .select('title slug images price area isAvailable address viewCount roomType createdAt')
      .sort({ createdAt: -1 })

    const stats = {
      totalRooms: rooms.length,
      availableRooms: rooms.filter((r) => r.isAvailable).length,
    }

    return sendResponse(res, 200, true, 'Hồ sơ chủ trọ', { landlord: user, rooms, stats })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}


