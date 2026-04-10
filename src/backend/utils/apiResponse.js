/**
 * Trả về response JSON chuẩn
 * @param {Object} res Response object của Express
 * @param {Number} statusCode Mã HTTP trạng thái (200, 201, 400,...)
 * @param {Boolean} success Trạng thái thành công
 * @param {String} message Tin nhắn thông báo
 * @param {Object|Array} data Dữ liệu trả về (mặc định null)
 * @param {Object|String} errors Lỗi chi tiết (nếu có)
 */
const sendResponse = (res, statusCode, success, message, data = null, errors = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    errors,
  })
}

module.exports = sendResponse
