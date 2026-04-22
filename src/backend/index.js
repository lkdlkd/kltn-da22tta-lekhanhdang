require('dotenv').config()
const http = require('http')
const express = require('express')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const connectDB = require('./utils/connectDB')
const path = require('path');

// Routes
const authRoutes = require('./routes/authRoutes')
const roomRoutes = require('./routes/roomRoutes')
const userRoutes = require('./routes/userRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const interactionRoutes = require('./routes/interactionRoutes')
const reviewRoutes = require('./routes/reviewRoutes')
const commentRoutes = require('./routes/commentRoutes')
const conversationRoutes = require('./routes/conversationRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const adminRoutes = require('./routes/adminRoutes')
const reportRoutes = require('./routes/reportRoutes')
const appointmentRoutes = require('./routes/appointmentRoutes')
const recommendRoutes = require('./routes/recommendRoutes')
const { compareRooms } = require('./controllers/compareController')
const sendResponse = require('./utils/apiResponse')

const app = express()
const server = http.createServer(app)
app.set('trust proxy', 1) // Render/Nginx reverse proxy → req.protocol = 'https'

// ── CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())

const corsOptions = {
  origin: (origin, callback) => {
    // Không có origin (curl, mobile, Postman, same-origin requests)
    if (!origin) return callback(null, true)
    // Cho phép tất cả localhost (mọi port) — dev + VPS local testing
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true)
    }
    // Danh sách origin được cấu hình qua env
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}
app.use(cors(corsOptions))

// ── Socket.io ─────────────────────────────────────────────────────────
const io = new Server(server, { cors: corsOptions })
app.set('io', io)

// ── Online Users Map: userId → Set<socketId> ─────────────────────────
const onlineUsers = new Map()
const addUserSocket = (uid, sid) => {
  if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set())
  onlineUsers.get(uid).add(sid)
}
const removeUserSocket = (uid, sid) => {
  const s = onlineUsers.get(uid); if (!s) return
  s.delete(sid); if (s.size === 0) onlineUsers.delete(uid)
}

// ── Unread count helper ─────────────────────────────────────────────────────────
async function emitUnreadCount(userId) {
  try {
    const Message = require('./models/Message')
    const Conversation = require('./models/Conversation')
    const convIds = (await Conversation.find({ participants: userId }).select('_id')).map((c) => c._id)
    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: userId },
      isRead: false,
    })
    io.to(`user:${String(userId)}`).emit('unread_count', { count })
  } catch { }
}

app.set('emitUnreadCount', emitUnreadCount)

io.on('connection', (socket) => {
  // User join personal room + track online
  socket.on('join_user', async (userId) => {
    const uid = String(userId)
    socket.join(`user:${uid}`)
    socket.data.userId = uid
    addUserSocket(uid, socket.id)
    socket.broadcast.emit('user_online', { userId: uid })
    // Emit unread count ngay khi user connect
    await emitUnreadCount(uid)
  })

  // Chat: join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`)
  })

  // Chat: send message (text + optional attachments)
  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message')
      const Conversation = require('./models/Conversation')
      const User = require('./models/User')
      const { conversationId, senderId, content, attachments } = data
      const hasContent = content?.trim()
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0
      if (!conversationId || !senderId || (!hasContent && !hasAttachments)) return

      // ── Lấy conversation + sender info trước khi tạo message ──────────
      const [conv, sender] = await Promise.all([
        Conversation.findById(conversationId).select('participants'),
        User.findById(senderId).select('role'),
      ])
      if (!conv) return

      // ── Kiểm tra đây có phải lần đầu sender nhắn trong conv không ─────
      const senderPriorCount = await Message.countDocuments({ conversation: conversationId, sender: senderId })
      const isFirstMsg = senderPriorCount === 0

      // ── Tạo message ────────────────────────────────────────────────────
      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        content: hasContent ? content.trim() : '',
        attachments: hasAttachments ? attachments : [],
      })
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
      })
      const populated = await Message.findById(message._id).populate('sender', 'name avatar')
      io.to(`conv:${conversationId}`).emit('receive_message', populated)
      socket.to(`conv:${conversationId}`).emit('typing_stop', { conversationId, userId: senderId })

      // ── Tracking tỷ lệ phản hồi ───────────────────────────────────────
      if (isFirstMsg) {
        const others = conv.participants.map(String).filter((p) => p !== String(senderId))

        if (sender?.role === 'student') {
          // Sinh viên nhắn lần đầu → tăng totalConvReceived của landlord
          for (const landlordId of others) {
            const landlord = await User.findById(landlordId).select('role')
            if (landlord?.role === 'landlord') {
              await User.findByIdAndUpdate(landlordId, { $inc: { '_respTracking.totalConvReceived': 1 } })
            }
          }
        } else if (sender?.role === 'landlord') {
          // Landlord reply lần đầu → tính responseTime + cập nhật stats
          const firstStudentMsg = await Message.findOne({
            conversation: conversationId,
            sender: { $nin: [senderId] },
          }).sort({ createdAt: 1 })

          if (firstStudentMsg) {
            const respMins = Math.round((Date.now() - new Date(firstStudentMsg.createdAt).getTime()) / 60000)
            const landlordDoc = await User.findById(senderId).select('_respTracking')
            if (landlordDoc) {
              const t = landlordDoc._respTracking || {}
              const newReplied = (t.totalConvReplied || 0) + 1
              const newReceived = Math.max(t.totalConvReceived || 0, newReplied)
              const newSum = (t.sumResponseMins || 0) + respMins
              const newRate = Math.round((newReplied / newReceived) * 100)
              const newAvg = Math.round(newSum / newReplied)
              await User.findByIdAndUpdate(senderId, {
                responseRate: newRate,
                avgResponseTime: newAvg,
                '_respTracking.totalConvReplied': newReplied,
                '_respTracking.totalConvReceived': newReceived,
                '_respTracking.sumResponseMins': newSum,
              })
            }
          }
        }
      }

      // ── Emit unread_count cho recipients ──────────────────────────────
      const recipients = conv.participants.map(String).filter((p) => p !== String(senderId))
      await Promise.all(recipients.map((uid) => emitUnreadCount(uid)))
    } catch (err) {
      console.error('Socket send_message error:', err.message)
    }
  })

  // Typing indicators
  const typingTimers = {}
  socket.on('typing_start', ({ conversationId, userId }) => {
    socket.to(`conv:${conversationId}`).emit('typing_start', { conversationId, userId })
    clearTimeout(typingTimers[conversationId])
    typingTimers[conversationId] = setTimeout(() => {
      socket.to(`conv:${conversationId}`).emit('typing_stop', { conversationId, userId })
    }, 4000)
  })
  socket.on('typing_stop', ({ conversationId, userId }) => {
    clearTimeout(typingTimers[conversationId])
    socket.to(`conv:${conversationId}`).emit('typing_stop', { conversationId, userId })
  })

  // Query online status of a list of userIds
  socket.on('check_online', ({ userIds }, callback) => {
    const result = {}
      ; (userIds || []).forEach((uid) => { result[String(uid)] = onlineUsers.has(String(uid)) })
    callback?.(result)
  })

  // Disconnect
  socket.on('disconnect', () => {
    const uid = socket.data.userId
    if (uid) {
      removeUserSocket(uid, socket.id)
      if (!onlineUsers.has(uid)) socket.broadcast.emit('user_offline', { userId: uid })
    }
    Object.values(typingTimers).forEach(clearTimeout)
  })
})

// ── Middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   // Vite inline scripts
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://res.cloudinary.com',             // Ảnh phòng trọ, avatar
        'https://*.tile.openstreetmap.org',        // Leaflet map tiles
        'https://nominatim.openstreetmap.org',     // Geocoding
        'https://images.unsplash.com',
        'https://lh3.googleusercontent.com',
      ],
      connectSrc: [
        "'self'",
        'https://res.cloudinary.com',
        'https://nominatim.openstreetmap.org',
        'wss:',                                    // WebSocket (socket.io)
        'ws:',
      ],
      mediaSrc: ["'self'", 'https://res.cloudinary.com'],  // Video phòng
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,               // Cho phép embed Leaflet tiles
}))
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/users', userRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/interactions', interactionRoutes)
app.use('/api/reviews', reviewRoutes)   // giữ lại vớng bạc compat
app.use('/api/comments', commentRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/recommend', recommendRoutes)
app.post('/api/rooms/compare', compareRooms)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// ── Serve React build (khi có VPS=1 trong env) ─────────────────────────────
const fs = require('fs')
const hasVPSConfig = process.env.VPS !== undefined
const buildPath = path.join(__dirname, 'public', 'dist')

if (hasVPSConfig && fs.existsSync(buildPath)) {
  console.log('✅ VPS mode - Serving React build from', buildPath)

  // Static assets (JS, CSS, images...) — cache dài
  app.use(express.static(buildPath, {
    maxAge: '30d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))

  // Catch-all: /api/* → 404 JSON; mọi route khác → React index.html
  app.use('/{*path}', (req, res) => {
    if (req.path.startsWith('/api')) {
      return sendResponse(res, 404, false, `Route ${req.originalUrl} không tồn tại`)
    }
    res.sendFile(path.join(buildPath, 'index.html'))
  })
} else {
  if (hasVPSConfig) {
    console.warn('⚠️ VPS is set nhưng không tìm thấy build folder:', buildPath)
  } else {
    console.log('ℹ️ API-only mode (không có VPS config)')
  }
  // API-only: 404 cho mọi route không khớp
  app.use('/{*path}', (req, res) => {
    sendResponse(res, 404, false, `Route ${req.originalUrl} không tồn tại`)
  })
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message)
  sendResponse(res, err.status || 500, false, err.message || 'Lỗi server nội bộ')
})


const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`)
})
connectDB()

module.exports = { app, io }
