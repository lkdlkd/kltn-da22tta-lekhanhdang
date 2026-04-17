import axiosInstance from '@/services/axiosInstance'

/**
 * Get similar rooms for a given room ID.
 * @param {string} roomId
 * @param {number} limit
 */
export const getSimilarRoomsApi = (roomId, limit = 6) =>
  axiosInstance.get(`/api/recommend/similar/${roomId}`, { params: { limit } })

/**
 * Wizard: get recommended rooms based on user criteria.
 * @param {object} criteria
 * @param {string|null} criteria.roomType
 * @param {number} criteria.priceMin
 * @param {number} criteria.priceMax
 * @param {number} criteria.areaMin
 * @param {number} criteria.capacity
 * @param {string[]} criteria.amenities
 * @param {number|null} criteria.lat
 * @param {number|null} criteria.lng
 * @param {number} criteria.radius
 * @param {number} criteria.limit
 */
export const wizardRecommendApi = (criteria) =>
  axiosInstance.post('/api/recommend/wizard', criteria)
