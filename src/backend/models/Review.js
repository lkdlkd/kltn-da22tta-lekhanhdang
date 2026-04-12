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

// Tự động cập nhật averageRating + reviewCount trên Room sau save/delete
async function recalcRoomRating(roomId) {
  const Room = mongoose.model('Room')
  const stats = await mongoose.model('Review').aggregate([
    { $match: { room: roomId, status: 'approved' } },
    { $group: { _id: '$room', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  if (stats.length > 0) {
    await Room.findByIdAndUpdate(roomId, {
      averageRating: Math.round(stats[0].avg * 10) / 10,
      reviewCount: stats[0].count,
    })
  } else {
    await Room.findByIdAndUpdate(roomId, { averageRating: 0, reviewCount: 0 })
  }
}

reviewSchema.post('save', async function () {
  await recalcRoomRating(this.room)
})
reviewSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) await recalcRoomRating(doc.room)
})
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await recalcRoomRating(doc.room)
})

module.exports = mongoose.model('Review', reviewSchema)
