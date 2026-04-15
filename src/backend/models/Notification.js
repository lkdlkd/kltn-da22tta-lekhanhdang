const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'new_room', 'room_approved', 'room_rejected',
        'new_message',
        'review_approved', 'review_rejected',
        'comment_approved', 'comment_replied',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: { type: String }, // URL người dùng sẽ được điều hướng khi click
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
