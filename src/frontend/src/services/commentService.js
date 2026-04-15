import axiosInstance from '@/services/axiosInstance'

export const getRoomCommentsApi  = (roomId) => axiosInstance.get(`/api/comments/room/${roomId}`)
export const createCommentApi    = (roomId, data) => axiosInstance.post(`/api/comments/room/${roomId}`, data)
export const deleteCommentApi    = (commentId) => axiosInstance.delete(`/api/comments/${commentId}`)
export const replyCommentApi     = (commentId, data) => axiosInstance.post(`/api/comments/${commentId}/reply`, data)

// Admin
export const adminGetCommentsApi    = (params) => axiosInstance.get('/api/admin/comments', { params })
export const adminApproveCommentApi = (id)     => axiosInstance.put(`/api/admin/comments/${id}/approve`)
export const adminRejectCommentApi  = (id)     => axiosInstance.put(`/api/admin/comments/${id}/reject`)
export const adminDeleteCommentApi  = (id)     => axiosInstance.delete(`/api/admin/comments/${id}`)
