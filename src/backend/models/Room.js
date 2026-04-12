const mongoose = require('mongoose')
const slugify = require('slugify')
const crypto = require('crypto')
const roomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên phòng là bắt buộc'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Mô tả là bắt buộc'],
    },
    price: {
      type: Number,
      required: [true, 'Giá thuê là bắt buộc'],
      min: [0, 'Giá không được âm'],
    },
    area: {
      type: Number,
      required: [true, 'Diện tích là bắt buộc'],
      min: [1, 'Diện tích không hợp lệ'],
    },
    capacity: {
      type: Number,
      default: 1,
    },
    roomType: {
      type: String,
      enum: ['phòng_trọ', 'chung_cư_mini', 'nhà_nguyên_căn', 'ký_túc_xá'],
      default: 'phòng_trọ',
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    images360: {
      type: [String],
      default: [],
    },
    address: {
      street: { type: String, required: true },
      ward: { type: String },
      district: { type: String },
      city: { type: String, default: 'Vĩnh Long' },
      fullAddress: { type: String },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Tạo 2dsphere index cho geospatial queries
roomSchema.index({ location: '2dsphere' })

// Text search index
roomSchema.index({ title: 'text', description: 'text', 'address.fullAddress': 'text' })

// Tự động tạo slug trước khi lưu
roomSchema.pre('save', async function (next) {
  if (!this.isModified('title') && this.slug) return next()

  const baseSlug = slugify(this.title, { lower: true, strict: true, locale: 'vi' })
  const shortId = crypto.randomBytes(4).toString('hex') // 8 chars
  this.slug = `${baseSlug}-${shortId}`
  next()
})

module.exports = mongoose.model('Room', roomSchema)
