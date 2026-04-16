import api from "./axios"



export const authApi = {
  login:         (data) => api.post('/auth/login', data),
  logout:        ()     => api.post('/auth/logout'),
  logoutAll:     ()     => api.post('/auth/logout-all'),
  me:            ()     => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
}