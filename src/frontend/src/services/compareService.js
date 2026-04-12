import axiosInstance from '@/services/axiosInstance'

export const compareRoomsApi = (roomIds, lat, lng) =>
  axiosInstance.post('/api/rooms/compare', { roomIds, lat, lng })
