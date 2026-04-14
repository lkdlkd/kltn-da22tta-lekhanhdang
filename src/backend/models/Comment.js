const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema(
  {
    room:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, minlength: 2, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

// Index để query nhanh
commentSchema.index({ room: 1, status: 1 })
commentSchema.index({ status: 1, createdAt: -1 })
commentSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Comment', commentSchema)
