const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên là bắt buộc'],
      trim: true,
      minlength: [2, 'Tên tối thiểu 2 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: [6, 'Mật khẩu tối thiểu 6 ký tự'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'landlord', 'admin'],
      default: 'student',
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: String,
    emailVerifyTokenExpires: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
    // Preferences cho recommendation
    preferences: {
      maxPrice: { type: Number, default: null },
      minArea: { type: Number, default: null },
      district: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
)

// Hash password trước khi lưu
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// So sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Tạo email verify token
userSchema.methods.createEmailVerifyToken = function () {
  const token = crypto.randomBytes(32).toString('hex')
  this.emailVerifyToken = crypto.createHash('sha256').update(token).digest('hex')
  this.emailVerifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000 // 24 giờ
  return token
}

// Tạo password reset token
userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex')
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex')
  this.passwordResetTokenExpires = Date.now() + 60 * 60 * 1000 // 1 giờ
  return token
}

module.exports = mongoose.model('User', userSchema)
