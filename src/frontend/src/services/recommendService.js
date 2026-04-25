import axiosInstance from '@/services/axiosInstance'

/**
 * API 1 — Gợi ý phòng tương tự phòng đang xem
 * @param {string} roomId
 * @param {number} limit
 */
export const getSimilarRoomsApi = (roomId, limit = 6) =>
  axiosInstance.get(`/api/recommend/similar/${roomId}`, { params: { limit } })

/**
 * API 2 — Gợi ý theo tiêu chí tìm kiếm (wizard/search page)
 * Criteria phải do người dùng cung cấp, không tự động suy ra.
 * @param {object} criteria
 */
export const wizardRecommendApi = (criteria) =>
  axiosInstance.post('/api/recommend/wizard', criteria)

/**
 * API 3 — Gợi ý cá nhân hóa cho user (trang "Gợi ý cho bạn")
 * Tự động suy ra sở thích từ lịch sử xem/lưu phòng trong DB.
 * User có thể truyền thêm criteria để thu hẹp kết quả (tất cả đều tùy chọn).
 * Yêu cầu đăng nhập.
 *
 * @param {object} [extra={}] - Criteria bổ sung (tùy chọn)
 * @param {string|null}  [extra.roomType]
 * @param {number}       [extra.priceMin]
 * @param {number}       [extra.priceMax]
 * @param {number}       [extra.areaMin]
 * @param {number}       [extra.capacity]
 * @param {string[]}     [extra.amenities]
 * @param {number|null}  [extra.lat]
 * @param {number|null}  [extra.lng]
 * @param {number}       [extra.radius]
 * @param {number}       [extra.limit]
 */
export const forYouApi = (extra = {}) =>
  axiosInstance.post('/api/recommend/for-you', extra)
