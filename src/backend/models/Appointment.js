const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    timeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    note: { type: String, trim: true, default: '' },
    cancelReason: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

appointmentSchema.index({ student: 1, status: 1, date: -1 })
appointmentSchema.index({ landlord: 1, status: 1, date: -1 })
appointmentSchema.index({ room: 1, date: 1 })

module.exports = mongoose.model('Appointment', appointmentSchema)
