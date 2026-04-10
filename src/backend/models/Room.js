const mongoose = require('mongoose')
const slugify = require('slugify')
const { v4: uuidv4 } = require('uuid')

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
    amenities: {
      type: [String],
      default: [],
      // e.g. ['wifi', 'air_conditioner', 'washing_machine', 'parking', 'kitchen', 'private_bathroom']
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
      type: String,
      required: [true, 'Địa chỉ là bắt buộc'],
    },
    district: {
      type: String,
    },
    ward: {
      type: String,
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
roomSchema.index({ title: 'text', description: 'text', address: 'text' })

// Tự động tạo slug trước khi lưu
roomSchema.pre('save', async function (next) {
  if (!this.isModified('title') && this.slug) return next()

  const baseSlug = slugify(this.title, { lower: true, strict: true, locale: 'vi' })
  const shortId = uuidv4().split('-')[0] // 8 chars
  this.slug = `${baseSlug}-${shortId}`
  next()
})

module.exports = mongoose.model('Room', roomSchema)
