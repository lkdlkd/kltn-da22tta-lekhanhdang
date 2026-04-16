import axiosInstance from '@/services/axiosInstance'

export const getConversationsApi       = ()                    => axiosInstance.get('/api/conversations')
export const createConversationApi     = (recipientId, roomId) => axiosInstance.post('/api/conversations', { recipientId, roomId })
export const getMessagesApi            = (conversationId, page = 1) =>
  axiosInstance.get(`/api/conversations/${conversationId}/messages`, { params: { page } })
export const markConversationReadApi   = (conversationId)      => axiosInstance.patch(`/api/conversations/${conversationId}/read`)
export const getUnreadCountApi         = ()                    => axiosInstance.get('/api/conversations/unread-count')
export const uploadChatMediaApi        = (formData)            =>
  axiosInstance.post('/api/conversations/upload-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
