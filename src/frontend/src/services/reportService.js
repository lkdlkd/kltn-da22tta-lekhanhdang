import axiosInstance from '@/services/axiosInstance'

export const createReportApi = (roomId, data) => axiosInstance.post(`/api/reports/room/${roomId}`, data)
export const getMyReportStatusApi = (roomId) => axiosInstance.get(`/api/reports/room/${roomId}/status`)

// Admin
export const adminGetReportsApi = (params) => axiosInstance.get('/api/reports/admin', { params })
export const adminResolveReportApi = (id, action) =>
  axiosInstance.put(`/api/reports/admin/${id}/resolve`, { action })
