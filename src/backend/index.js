require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const connectDB = require('./utils/connectDB')

// Import routes
const authRoutes = require('./routes/authRoutes')
const sendResponse = require('./utils/apiResponse')

const app = express()

// Connect to MongoDB
connectDB()

// Security Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  message: 'Quá nhiều request, vui lòng thử lại sau',
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút',
})
// app.use('/api', limiter)
// app.use('/api/auth', authLimiter)

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes
app.use('/api/auth', authRoutes)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 404 handler — Express 5 dùng '/{*path}' thay vì '*'
app.use('/{*path}', (req, res) => {
  sendResponse(res, 404, false, `Route ${req.originalUrl} không tồn tại`)
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message)
  sendResponse(res, err.status || 500, false, err.message || 'Lỗi server nội bộ')
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Backend server đang chạy tại http://localhost:${PORT}`)
})

module.exports = app
