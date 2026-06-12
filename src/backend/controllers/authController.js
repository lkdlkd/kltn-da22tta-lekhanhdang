const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const { sendEmail, buildHtmlTemplate } = require('../services/emailService')
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
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return sendResponse(res, 409, false, 'Email đã được sử dụng')
    }

    const username = await generateUsername(email)

    // Check if this is the very first user in the database
    const isFirstUser = (await User.countDocuments({})) === 0
    const userRole = isFirstUser ? 'admin' : 'unassigned'
    const isVerified = isFirstUser ? true : false

    const user = await User.create({
      name,
      username,
      email,
      password,
      role: userRole,
      isEmailVerified: isVerified,
    })

    if (isFirstUser) {
      return createSendToken(user, 201, res)
    }

    sendResponse(res, 201, true, 'Đăng ký bước 1 thành công! Vui lòng chọn vai trò.', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    })
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

// POST /api/auth/finalize-role
exports.finalizeRole = async (req, res) => {
  try {
    const { email, role } = req.body

    if (!email || !role) {
      return sendResponse(res, 400, false, 'Vui lòng cung cấp đầy đủ email và vai trò')
    }

    if (!['student', 'landlord'].includes(role)) {
      return sendResponse(res, 400, false, 'Vai trò không hợp lệ')
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return sendResponse(res, 404, false, 'Không tìm thấy người dùng')
    }

    if (user.role !== 'unassigned') {
      return sendResponse(res, 400, false, 'Tài khoản này đã có vai trò')
    }

    user.role = role

    // Nếu đăng ký qua Google HOẶC chọn vai trò là sinh viên: tự động xác thực và đăng nhập luôn
    if (user.googleId || role === 'student') {
      user.isEmailVerified = true
      await user.save()
      return createSendToken(user, 201, res)
    }

    // Chủ trọ đăng ký thường: cần xác minh email trước khi sử dụng
    const verifyToken = user.createEmailVerifyToken()
    await user.save({ validateBeforeSave: false })

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`

    const emailHtml = buildHtmlTemplate(
      'Xác thực Email',
      `
        <p>Xin chào <strong>${user.name}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản <strong>Chủ trọ</strong> tại hệ thống <strong>PhòngTrọ Sinh Viên</strong>.</p>
        <p>Để hoàn tất quá trình đăng ký và bắt đầu đăng tin cho thuê phòng trọ, vui lòng nhấp vào nút xác thực dưới đây:</p>
        <div class="accent-box">
          <p><strong>Lưu ý:</strong> Liên kết xác thực này chỉ có hiệu lực trong vòng <strong>24 giờ</strong>. Nếu quá thời gian trên, bạn sẽ cần thực hiện lại quy trình đăng ký.</p>
        </div>
      `,
      'Xác thực tài khoản',
      verifyUrl
    )

    // Gửi email xác thực trong background, tránh block API dẫn đến timeout
    sendEmail({
      to: user.email,
      subject: '[PhòngTrọ Sinh Viên] Xác thực địa chỉ Email của bạn',
      html: emailHtml,
    }).catch((emailErr) => {
      console.error('Không thể gửi email xác thực trong background:', emailErr.message)
    })

    sendResponse(res, 200, true, 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản chủ trọ.', {
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

    if (!user.isEmailVerified) {
      return sendResponse(res, 403, false, 'Tài khoản của bạn chưa được xác thực email. Vui lòng kiểm tra hộp thư để xác thực.')
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

    const emailHtml = buildHtmlTemplate(
      'Đặt lại mật khẩu',
      `
        <p>Xin chào <strong>${user.name}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu thiết lập lại mật khẩu cho tài khoản liên kết với email này trên hệ thống <strong>PhòngTrọ Sinh Viên</strong>.</p>
        <p>Để đặt mật khẩu mới, vui lòng nhấp vào nút bên dưới:</p>
        <div class="accent-box">
          <p><strong>Lưu ý quan trọng:</strong> Đường dẫn này chỉ có hiệu lực trong vòng <strong>1 giờ</strong>. Nếu không phải bạn gửi yêu cầu này, vui lòng bỏ qua email này để giữ an toàn cho tài khoản.</p>
        </div>
      `,
      'Đặt lại mật khẩu',
      resetUrl
    )

    // Gửi email đặt lại mật khẩu trong background, tránh block API dẫn đến timeout
    sendEmail({
      to: user.email,
      subject: '[PhòngTrọ Sinh Viên] Yêu cầu khôi phục mật khẩu',
      html: emailHtml,
    }).catch((emailErr) => {
      console.error('Không thể gửi email đặt lại mật khẩu trong background:', emailErr.message)
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

const FRONTEND_URL = process.env.FRONTEND_URL

// GET /api/auth/google — redirect to Google consent
exports.googleRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

// GET /api/auth/google/callback — exchange code → upsert user → redirect FE
exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=google_failed`)

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
    if (!tokenData.id_token) return res.redirect(`${FRONTEND_URL}/login?error=google_failed`)

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
      // Check if this is the very first user in the database
      const isFirstUser = (await User.countDocuments({})) === 0
      const userRole = isFirstUser ? 'admin' : 'unassigned'

      const username = await generateUsername(email)
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        username,
        avatar: picture || '',
        role: userRole,
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

    const token = signToken(user._id)
    res.redirect(`${FRONTEND_URL}/login?token=${token}`)
  } catch (error) {
    console.error('Google callback error:', error)
    res.redirect(`${FRONTEND_URL}/login?error=google_failed`)
  }
}

// POST /api/auth/google — authenticate using Google Credential (ID Token) or Access Token
exports.googleLoginApi = async (req, res) => {
  try {
    const { credential, accessToken } = req.body

    if (!credential && !accessToken) {
      return sendResponse(res, 400, false, 'Thiếu thông tin xác thực Google (credential hoặc accessToken)')
    }

    let email, name, picture, googleId

    if (credential) {
      // 1. Xác thực bằng ID Token (credential)
      const { OAuth2Client } = require('google-auth-library')
      const client = new OAuth2Client(GOOGLE_CLIENT_ID)
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      email = payload.email
      name = payload.name
      picture = payload.picture
      googleId = payload.sub
    } else if (accessToken) {
      // 2. Xác thực bằng Access Token thông qua API Google UserInfo
      const axios = require('axios')
      const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`)
      const payload = response.data
      email = payload.email
      name = payload.name
      picture = payload.picture
      googleId = payload.sub
    }

    if (!email) {
      return sendResponse(res, 400, false, 'Không thể lấy thông tin email từ tài khoản Google')
    }

    // Upsert user
    let user = await User.findOne({ email })
    if (!user) {
      // Check if this is the very first user in the database
      const isFirstUser = (await User.countDocuments({})) === 0
      const userRole = isFirstUser ? 'admin' : 'unassigned'

      const username = await generateUsername(email)
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        username,
        avatar: picture || '',
        role: userRole,
        isEmailVerified: true,
        googleId,
        password: crypto.randomBytes(20).toString('hex'),
      })
    } else {
      let isUpdated = false
      if (!user.googleId) {
        user.googleId = googleId
        isUpdated = true
      }
      if (!user.avatar && picture) {
        user.avatar = picture
        isUpdated = true
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true
        isUpdated = true
      }
      if (isUpdated) {
        await user.save()
      }
    }

    if (user.isBanned) {
      return sendResponse(res, 403, false, 'Tài khoản của bạn đã bị khoá')
    }

    createSendToken(user, 200, res)
  } catch (error) {
    console.error('Google API Login Error:', error)
    sendResponse(res, 401, false, 'Xác thực tài khoản Google thất bại: ' + error.message)
  }
}

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return sendResponse(res, 400, false, 'Vui lòng cung cấp email')
    }

    const user = await User.findOne({ email: email.toLowerCase() })

    if (user && user.isEmailVerified) {
      return sendResponse(res, 400, false, 'Tài khoản này đã được xác thực email. Vui lòng đăng nhập.')
    }

    if (user) {
      const verifyToken = user.createEmailVerifyToken()
      await user.save({ validateBeforeSave: false })

      const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`

      const emailHtml = buildHtmlTemplate(
        'Xác thực Email',
        `
          <p>Xin chào <strong>${user.name}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản <strong>Chủ trọ</strong> tại hệ thống <strong>PhòngTrọ Sinh Viên</strong>.</p>
          <p>Để hoàn tất quá trình đăng ký và bắt đầu đăng tin cho thuê phòng trọ, vui lòng nhấp vào nút xác thực dưới đây:</p>
          <div class="accent-box">
            <p><strong>Lưu ý:</strong> Liên kết xác thực này chỉ có hiệu lực trong vòng <strong>24 giờ</strong>. Nếu quá thời gian trên, bạn sẽ cần thực hiện lại quy trình đăng ký.</p>
          </div>
        `,
        'Xác thực tài khoản',
        verifyUrl
      )

      sendEmail({
        to: user.email,
        subject: '[PhòngTrọ Sinh Viên] Xác thực địa chỉ Email của bạn',
        html: emailHtml,
      }).catch((emailErr) => {
        console.error('Không thể gửi email xác thực trong background:', emailErr.message)
      })
    }

    sendResponse(res, 200, true, 'Email xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư của bạn.')
  } catch (error) {
    sendResponse(res, 500, false, error.message)
  }
}

