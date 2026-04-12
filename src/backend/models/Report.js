const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['fake_info', 'wrong_price', 'fake_images', 'spam', 'other'],
      required: true,
    },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

// 1 user chỉ report 1 phòng 1 lần
reportSchema.index({ room: 1, reportedBy: 1 }, { unique: true })
reportSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('Report', reportSchema)
