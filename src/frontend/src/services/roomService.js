import axiosInstance from '@/services/axiosInstance'

export const getRoomsApi = (params = {}) => axiosInstance.get('/api/rooms', { params })

// Alias dùng cho trang Search — params được chuẩn hoá từ filter state
export const searchRoomsApi = (params = {}) => {
  const cleaned = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      // Chuyển mảng amenities thành JSON string nếu là array
      cleaned[key] = Array.isArray(value) ? JSON.stringify(value) : value
    }
  })
  return axiosInstance.get('/api/rooms', { params: cleaned })
}

export const getNearbyRoomsApi = (lat, lng, limit = 5) =>
  axiosInstance.get('/api/rooms/nearby', { params: { lat, lng, limit } })

export const getMyRoomsApi = () => axiosInstance.get('/api/rooms/my-rooms')

export const getRoomByIdApi = (id) => axiosInstance.get(`/api/rooms/${id}`)

export const getRoomBySlugApi = (slug) => axiosInstance.get(`/api/rooms/slug/${slug}`)

export const createRoomApi = (formData) =>
  axiosInstance.post('/api/rooms', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateRoomApi = (id, formData) =>
  axiosInstance.put(`/api/rooms/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const deleteRoomApi = (id) => axiosInstance.delete(`/api/rooms/${id}`)

export const getRoomDistanceApi = (id, lat, lng) =>
  axiosInstance.get(`/api/rooms/${id}/distance`, {
    params: { lat, lng },
  })

