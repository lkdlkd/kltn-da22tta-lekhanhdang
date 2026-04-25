const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, required: true, trim: true, minlength: 10 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

// Mỗi user chỉ review 1 phòng 1 lần
reviewSchema.index({ room: 1, user: 1 }, { unique: true })
reviewSchema.index({ room: 1, status: 1 })
reviewSchema.index({ status: 1, createdAt: -1 })


module.exports = mongoose.model('Review', reviewSchema)
