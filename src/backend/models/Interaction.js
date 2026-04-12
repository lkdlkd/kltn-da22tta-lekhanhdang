const mongoose = require('mongoose')

const interactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    type: {
      type: String,
      enum: ['view', 'save', 'review'],
      required: true,
    },
  },
  { timestamps: true }
)

// Index cho recently-viewed query
interactionSchema.index({ user: 1, type: 1, createdAt: -1 })
// Index cho AI recommendation (user-room matrix)
interactionSchema.index({ user: 1, room: 1, type: 1 })

module.exports = mongoose.model('Interaction', interactionSchema)
