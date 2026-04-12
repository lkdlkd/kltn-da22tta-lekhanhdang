const express = require('express')
const { authenticate, authorize } = require('../middlewares/auth')
const { createReport, getMyReportStatus, adminGetReports, adminResolveReport } = require('../controllers/reportController')

const router = express.Router()

// User routes
router.post('/room/:id', authenticate, createReport)
router.get('/room/:id/status', authenticate, getMyReportStatus)

// Admin routes
router.get('/admin', authenticate, authorize('admin'), adminGetReports)
router.put('/admin/:id/resolve', authenticate, authorize('admin'), adminResolveReport)

module.exports = router
