import api from './axios';

export const getNotifications  = ()    => api.get('/notifications');
export const markAsRead        = (id)  => api.put(`/notifications/${id}/read`);
export const markAllRead       = ()    => api.put('/notifications/read-all');

// FCM token management
export const registerFcmToken  = (token, device = 'web') =>
  api.post('/notifications/fcm-token', { token, device });

export const removeFcmToken    = (token) =>
  api.delete('/notifications/fcm-token', { data: { token } });
