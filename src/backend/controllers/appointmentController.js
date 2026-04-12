const Appointment = require('../models/Appointment')
const Room = require('../models/Room')
const sendResponse = require('../utils/apiResponse')
const { createNotification } = require('./notificationController')

const TIME_SLOT_LABELS = {
  morning: 'Sáng (8h–12h)',
  afternoon: 'Chiều (13h–17h)',
  evening: 'Tối (18h–20h)',
}

// POST /api/appointments — Sinh viên đặt lịch
exports.createAppointment = async (req, res) => {
  try {
    const { roomId, date, timeSlot, note } = req.body
    if (!roomId || !date || !timeSlot) return sendResponse(res, 400, false, 'Thiếu thông tin đặt lịch')

    const appointDate = new Date(date)
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1)
    if (appointDate < tomorrow) return sendResponse(res, 400, false, 'Ngày hẹn phải từ ngày mai trở đi')

    const room = await Room.findById(roomId).populate('landlord', '_id name')
    if (!room) return sendResponse(res, 404, false, 'Không tìm thấy phòng')

    const appointment = await Appointment.create({
      room: roomId,
      student: req.user._id,
      landlord: room.landlord._id,
      date: appointDate,
      timeSlot,
      note: note?.trim() || '',
    })

    // Notify chủ trọ
    await createNotification({
      userId: room.landlord._id,
      type: 'system',
      title: 'Có lịch hẹn xem phòng mới',
      body: `${req.user.name} muốn xem phòng "${room.title}" vào ${TIME_SLOT_LABELS[timeSlot]} ngày ${new Date(date).toLocaleDateString('vi-VN')}`,
      link: '/landlord/appointments',
      io: req.app.get('io'),
    })

    return sendResponse(res, 201, true, 'Đặt lịch thành công', { appointment })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// GET /api/appointments
exports.getAppointments = async (req, res) => {
  try {
    const query = {}
    if (req.user.role === 'student') query.student = req.user._id
    else if (req.user.role === 'landlord') query.landlord = req.user._id

    if (req.query.status) query.status = req.query.status

    const appointments = await Appointment.find(query)
      .populate('room', 'title slug images address')
      .populate('student', 'name email phone')
      .populate('landlord', 'name email phone')
      .sort({ date: -1 })

    return sendResponse(res, 200, true, 'Danh sách lịch hẹn', { appointments })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/appointments/:id/confirm — Chủ trọ xác nhận
exports.confirmAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id).populate('room', 'title')
    if (!appt) return sendResponse(res, 404, false, 'Không tìm thấy lịch hẹn')
    if (String(appt.landlord) !== String(req.user._id)) return sendResponse(res, 403, false, 'Không có quyền')

    appt.status = 'confirmed'
    await appt.save()

    await createNotification({
      userId: appt.student,
      type: 'system',
      title: 'Lịch hẹn đã được xác nhận',
      body: `Chủ trọ đã xác nhận lịch hẹn xem phòng "${appt.room.title}" của bạn.`,
      link: '/appointments',
      io: req.app.get('io'),
    })

    return sendResponse(res, 200, true, 'Đã xác nhận lịch hẹn', { appointment: appt })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/appointments/:id/cancel
exports.cancelAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id).populate('room', 'title')
    if (!appt) return sendResponse(res, 404, false, 'Không tìm thấy lịch hẹn')

    const isStudent = String(appt.student) === String(req.user._id)
    const isLandlord = String(appt.landlord) === String(req.user._id)
    if (!isStudent && !isLandlord) return sendResponse(res, 403, false, 'Không có quyền')
    if (['cancelled', 'completed'].includes(appt.status)) return sendResponse(res, 400, false, 'Không thể huỷ lịch này')

    appt.status = 'cancelled'
    appt.cancelReason = req.body.cancelReason?.trim() || ''
    await appt.save()

    // Notify bên còn lại
    const notifyUserId = isStudent ? appt.landlord : appt.student
    await createNotification({
      userId: notifyUserId,
      type: 'system',
      title: 'Lịch hẹn đã bị huỷ',
      body: `Lịch hẹn xem phòng "${appt.room.title}" đã bị huỷ${appt.cancelReason ? `: ${appt.cancelReason}` : '.'}`,
      link: isStudent ? '/landlord/appointments' : '/appointments',
      io: req.app.get('io'),
    })

    return sendResponse(res, 200, true, 'Đã huỷ lịch hẹn', { appointment: appt })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}

// PUT /api/appointments/:id/complete — Chủ trọ đánh dấu hoàn thành
exports.completeAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
    if (!appt) return sendResponse(res, 404, false, 'Không tìm thấy lịch hẹn')
    if (String(appt.landlord) !== String(req.user._id)) return sendResponse(res, 403, false, 'Không có quyền')

    appt.status = 'completed'
    await appt.save()
    return sendResponse(res, 200, true, 'Đã hoàn thành lịch hẹn', { appointment: appt })
  } catch (error) {
    return sendResponse(res, 500, false, error.message)
  }
}
