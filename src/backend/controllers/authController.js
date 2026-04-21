const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const { sendEmail } = require('../services/emailService')
const sendResponse = require('../utils/apiResponse')
// Helper tạo JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// Helper response với token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
  }
  sendResponse(res, statusCode, true, 'Thao tác thành công', { token, user: userResponse })
}

// Helper: sinh username unique từ email
async function generateUsername(email) {
  // Lấy phần trước @, chuyển về lowercase, bỏ ký tự không hợp lệ
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
  let username = base
  let attempt = 0
  while (await User.exists({ username })) {
    attempt += 1
    username = `${base}_${attempt}`
  }
  return username
}

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    const userRole = role || 'student'

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return sendResponse(res, 409, false, 'Email đã được sử dụng')
    }

    const username = await generateUsername(email)

    // Sinh viên: tự động xác thực, đăng nhập luôn
    if (userRole === 'student') {
      const user = await User.create({
        name,
        username,
        email,
        password,
        role: 'student',
        isEmailVerified: true,
      })
      return createSendToken(user, 201, res)
    }

    // Chủ trọ: cần xác minh email trước khi sử dụng
    const user = await User.create({ name, username, email, password, role: 'landlord' })

    const verifyToken = user.createEmailVerifyToken()
    await user.save({ validateBeforeSave: false })

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`
    try {
      await sendEmail({
        to: user.email,
        subject: '✅ Xác thực email — PhòngTrọ VL',
        html: `<p>Chào ${user.name},</p>
               <p>Cảm ơn bạn đã đăng ký tài khoản <strong>Chủ trọ</strong>.</p>
               <p>Vui lòng <a href="${verifyUrl}">click vào đây</a> để xác thực email và bắt đầu đăng tin phòng trọ.</p>
               <p>Link có hiệu lực trong <strong>24 giờ</strong>.</p>`,
      })
    } catch (emailErr) {
      await User.findByIdAndDelete(user._id)
      return sendResponse(res, 500, false, 'Không thể gửi email xác thực. Vui lòng thử lại.')
    }

    sendResponse(res, 201, true, 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản chủ trọ.', {
      requireEmailVerification: true,
    })
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return sendResponse(res, 400, false, 'Vui lòng nhập email và mật khẩu')
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return sendResponse(res, 401, false, 'Email hoặc mật khẩu không đúng')
    }

    if (user.isBanned) {
      return sendResponse(res, 403, false, 'Tài khoản của bạn đã bị khoá')
    }

    createSendToken(user, 200, res)
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// POST /api/auth/logout
exports.logout = async (req, res) => {
  // JWT là stateless, client xoá token ở local
  sendResponse(res, 200, true, 'Đăng xuất thành công')
}

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    sendResponse(res, 200, true, 'Lấy thông tin thành công', { user })
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex')

    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyTokenExpires: { $gt: Date.now() },
    })

    if (!user) {
      return sendResponse(res, 400, false, 'Token không hợp lệ hoặc đã hết hạn')
    }

    user.isEmailVerified = true
    user.emailVerifyToken = undefined
    user.emailVerifyTokenExpires = undefined
    await user.save({ validateBeforeSave: false })

    sendResponse(res, 200, true, 'Xác thực email thành công!')
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
      // Không tiết lộ email tồn tại hay không
      return sendResponse(res, 200, true, 'Nếu email tồn tại, link đặt lại mật khẩu sẽ được gửi')
    }

    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    await sendEmail({
      to: user.email,
      subject: '🔑 Đặt lại mật khẩu — PhòngTrọ VL',
      html: `<p>Chào ${user.name},</p><p>Vui lòng <a href="${resetUrl}">click vào đây</a> để đặt lại mật khẩu. Link có hiệu lực trong 1 giờ.</p>`,
    })

    sendResponse(res, 200, true, 'Email đặt lại mật khẩu đã được gửi')
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: Date.now() },
    })

    if (!user) {
      return sendResponse(res, 400, false, 'Token không hợp lệ hoặc đã hết hạn')
    }

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetTokenExpires = undefined
    await user.save()

    createSendToken(user, 200, res)
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// ── Google OAuth2 - Backend Redirect Flow ─────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'

// Tự detect frontend URL: trong VPS mode dùng cùng host với request
const getFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL
  if (process.env.VPS) return `${req.protocol}://${req.get('host')}`
  return 'http://localhost:5173'
}

// GET /api/auth/google?role=student|landlord — redirect to Google consent
exports.googleRedirect = (req, res) => {
  const role = ['student', 'landlord'].includes(req.query.role) ? req.query.role : 'student'
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: role,  // carry role through OAuth round-trip
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

// GET /api/auth/google/callback — exchange code → upsert user → redirect FE
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query
    if (!code) return res.redirect(`${getFrontendUrl(req)}/login?error=google_failed`)

    // Role from state (set during redirect); fallback to student
    const chosenRole = ['student', 'landlord'].includes(state) ? state : 'student'

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.id_token) return res.redirect(`${getFrontendUrl(req)}/login?error=google_failed`)

    // Verify id_token and extract user info
    const { OAuth2Client } = require('google-auth-library')
    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({
      idToken: tokenData.id_token,
      audience: GOOGLE_CLIENT_ID,
    })
    const { email, name, picture, sub: googleId } = ticket.getPayload()

    // Upsert user
    let user = await User.findOne({ email })
    if (!user) {
      // Brand-new user — use chosenRole from state
      const username = await generateUsername(email)
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        username,
        avatar: picture || '',
        role: chosenRole,
        isEmailVerified: true,
        googleId,
        password: crypto.randomBytes(20).toString('hex'),
      })
    } else if (!user.googleId) {
      // Link existing account with Google (keep existing role)
      user.googleId = googleId
      if (!user.avatar && picture) user.avatar = picture
      user.isEmailVerified = true
      await user.save()
    }
    // Existing Google users: role is NOT changed (they chose once at sign-up)

    const token = signToken(user._id)
    res.redirect(`${getFrontendUrl(req)}/login?token=${token}`)
  } catch (error) {
    console.error('Google callback error:', error)
    res.redirect(`${getFrontendUrl(req)}/login?error=google_failed`)
  }
}
