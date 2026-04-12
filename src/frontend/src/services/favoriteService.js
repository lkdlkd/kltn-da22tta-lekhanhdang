import axiosInstance from '@/services/axiosInstance'

export const getFavoritesApi = () => axiosInstance.get('/api/favorites')
export const getFavoriteIdsApi = () => axiosInstance.get('/api/favorites/ids')
export const addFavoriteApi = (roomId) => axiosInstance.post(`/api/favorites/${roomId}`)
export const removeFavoriteApi = (roomId) => axiosInstance.delete(`/api/favorites/${roomId}`)
