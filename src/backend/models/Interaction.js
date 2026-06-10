const mongoose = require('mongoose')

const interactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    type: {
      type: String,
      enum: ['view', 'save', 'chat', 'booking'],
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
)

// Index cho recently-viewed query
interactionSchema.index({ user: 1, type: 1, updatedAt: -1 })
// Index cho AI recommendation (user-room matrix)
interactionSchema.index({ user: 1, room: 1, type: 1 })

module.exports = mongoose.model('Interaction', interactionSchema)
