const jwt = require('jsonwebtoken')
const User = require('../models/User')
const sendResponse = require('../utils/apiResponse')

/**
 * Middleware: kiểm tra JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, false, 'Bạn chưa đăng nhập')
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return sendResponse(res, 401, false, 'Token không hợp lệ')
    }

    if (user.isBanned) {
      return sendResponse(res, 403, false, 'Tài khoản của bạn đã bị khoá')
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, false, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
    }
    return sendResponse(res, 401, false, 'Token không hợp lệ')
  }
}

/**
 * Middleware: phân quyền theo role
 * @param {...string} roles — các role được phép truy cập
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, 'Bạn chưa đăng nhập')
    }
    if (!roles.includes(req.user.role)) {
      return sendResponse(res, 403, false, 'Bạn không có quyền thực hiện thao tác này')
    }
    next()
  }
}

module.exports = { authenticate, authorize }
