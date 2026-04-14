require('dotenv').config()
const http = require('http')
const express = require('express')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const connectDB = require('./utils/connectDB')

// Routes
const authRoutes = require('./routes/authRoutes')
const roomRoutes = require('./routes/roomRoutes')
const userRoutes = require('./routes/userRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const interactionRoutes = require('./routes/interactionRoutes')
const reviewRoutes     = require('./routes/reviewRoutes')
const commentRoutes    = require('./routes/commentRoutes')
const conversationRoutes = require('./routes/conversationRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const adminRoutes = require('./routes/adminRoutes')
const reportRoutes = require('./routes/reportRoutes')
const appointmentRoutes = require('./routes/appointmentRoutes')
const { compareRooms } = require('./controllers/compareController')
const sendResponse = require('./utils/apiResponse')

const app = express()
const server = http.createServer(app)

// ── CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
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

io.on('connection', (socket) => {
  // User join personal room + track online
  socket.on('join_user', (userId) => {
    const uid = String(userId)
    socket.join(`user:${uid}`)
    socket.data.userId = uid
    addUserSocket(uid, socket.id)
    socket.broadcast.emit('user_online', { userId: uid })
  })

  // Chat: join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`)
  })

  // Chat: send message
  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message')
      const Conversation = require('./models/Conversation')
      const { conversationId, senderId, content } = data
      if (!conversationId || !senderId || !content?.trim()) return

      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        content: content.trim(),
      })
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
      })
      const populated = await Message.findById(message._id).populate('sender', 'name avatar')
      io.to(`conv:${conversationId}`).emit('receive_message', populated)
      // Auto-stop typing khi gửi tin
      socket.to(`conv:${conversationId}`).emit('typing_stop', { conversationId, userId: senderId })
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
    ;(userIds || []).forEach((uid) => { result[String(uid)] = onlineUsers.has(String(uid)) })
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
app.use(helmet())
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
app.post('/api/rooms/compare', compareRooms)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 404
app.use('/{*path}', (req, res) => {
  sendResponse(res, 404, false, `Route ${req.originalUrl} không tồn tại`)
})

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
