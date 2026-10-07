import api from './axios';

export const createBloodRequest = (data) => api.post('/blood-requests', data);
export const getBloodRequests = (params) => api.get('/blood-requests', { params });
export const getBloodRequestById = (id) => api.get(`/blood-requests/${id}`);
export const updateBloodRequest = (id, data) => api.put(`/blood-requests/${id}`, data);
export const deleteBloodRequest = (id) => api.delete(`/blood-requests/${id}`);
export const respondToBloodRequest = (id, data) => api.post(`/blood-requests/${id}/respond`, data);
export const getRequestResponses = (id) => api.get(`/blood-requests/${id}/responses`);
