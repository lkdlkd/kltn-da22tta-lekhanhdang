import axiosInstance from '@/services/axiosInstance'

export const createAppointmentApi = (data) => axiosInstance.post('/api/appointments', data)
export const getAppointmentsApi = (params) => axiosInstance.get('/api/appointments', { params })
export const confirmAppointmentApi = (id) => axiosInstance.put(`/api/appointments/${id}/confirm`)
export const cancelAppointmentApi = (id, cancelReason) =>
  axiosInstance.put(`/api/appointments/${id}/cancel`, { cancelReason })
export const completeAppointmentApi = (id) => axiosInstance.put(`/api/appointments/${id}/complete`)
