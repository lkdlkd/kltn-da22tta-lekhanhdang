const express = require('express')
const { authenticate, authorize } = require('../middlewares/auth')
const {
  createAppointment, getAppointments,
  confirmAppointment, cancelAppointment, completeAppointment,
} = require('../controllers/appointmentController')

const router = express.Router()

router.use(authenticate)
router.post('/', createAppointment)
router.get('/', getAppointments)
router.put('/:id/confirm', authorize('landlord', 'admin'), confirmAppointment)
router.put('/:id/cancel', cancelAppointment)
router.put('/:id/complete', authorize('landlord', 'admin'), completeAppointment)

module.exports = router
