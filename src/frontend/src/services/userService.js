import axiosInstance from '@/services/axiosInstance'

export const getProfileApi = () => axiosInstance.get('/api/users/profile')

export const updateProfileApi = (formData) =>
  axiosInstance.put('/api/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const changePasswordApi = (data) => axiosInstance.put('/api/users/change-password', data)
