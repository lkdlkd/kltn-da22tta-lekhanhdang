import axiosInstance from '@/services/axiosInstance'

export const createInteractionApi = (roomId, type) =>
  axiosInstance.post('/api/interactions', { roomId, type })

export const getRecentlyViewedApi = (limit = 10) =>
  axiosInstance.get('/api/interactions/recently-viewed', { params: { limit } })
