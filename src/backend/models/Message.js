const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, default: '' },
    isRead: { type: Boolean, default: false },
    // Đính kèm ảnh/video
    attachments: [
      {
        url:  { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        _id:  false,
      },
    ],
    // Loại tin nhắn đặc biệt
    messageType: {
      type: String,
      enum: ['text', 'appointment'],
      default: 'text',
    },
    appointmentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  },
  { timestamps: true }
)

messageSchema.index({ conversation: 1, createdAt: 1 })

module.exports = mongoose.model('Message', messageSchema)
