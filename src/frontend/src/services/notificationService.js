import axiosInstance from '@/services/axiosInstance'

export const getNotificationsApi = (params) => axiosInstance.get('/api/notifications', { params })
export const markOneReadApi = (id) => axiosInstance.put(`/api/notifications/${id}/read`)
export const markAllReadApi = () => axiosInstance.put('/api/notifications/read-all')
