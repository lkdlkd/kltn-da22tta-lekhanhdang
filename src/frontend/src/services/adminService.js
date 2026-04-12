import axiosInstance from '@/services/axiosInstance'

export const adminGetRoomsApi = (params) => axiosInstance.get('/api/admin/rooms', { params })
export const adminApproveRoomApi = (id) => axiosInstance.put(`/api/admin/rooms/${id}/approve`)
export const adminRejectRoomApi = (id, reason) => axiosInstance.put(`/api/admin/rooms/${id}/reject`, { reason })
export const adminGetUsersApi = (params) => axiosInstance.get('/api/admin/users', { params })
export const adminBanUserApi = (id) => axiosInstance.put(`/api/admin/users/${id}/ban`)
export const adminUnbanUserApi = (id) => axiosInstance.put(`/api/admin/users/${id}/unban`)
export const adminGetStatsApi = () => axiosInstance.get('/api/admin/stats')
