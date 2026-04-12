import axiosInstance from '@/services/axiosInstance'

export const getRoomReviewsApi = (roomId) => axiosInstance.get(`/api/reviews/room/${roomId}`)
export const createReviewApi = (roomId, data) => axiosInstance.post(`/api/reviews/room/${roomId}`, data)
export const updateReviewApi = (reviewId, data) => axiosInstance.put(`/api/reviews/${reviewId}`, data)
export const deleteReviewApi = (reviewId) => axiosInstance.delete(`/api/reviews/${reviewId}`)

// Admin
export const adminGetReviewsApi = (params) => axiosInstance.get('/api/admin/reviews', { params })
export const adminApproveReviewApi = (id) => axiosInstance.put(`/api/admin/reviews/${id}/approve`)
export const adminRejectReviewApi = (id) => axiosInstance.put(`/api/admin/reviews/${id}/reject`)
