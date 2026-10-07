import api from './axios';

export const getMyDonorProfile = () => api.get('/donors/me');
export const getDonorById = (id) => api.get(`/donors/${id}`);
export const getAllDonors = (params) => api.get('/donors', { params });
export const updateDonor = (id, data) => api.put(`/donors/${id}`, data);
export const deleteDonor = (id) => api.delete(`/donors/${id}`);
export const submitQuestionnaire = (data) => api.post('/donors/questionnaire', data);
export const getHealthReports = (id) => api.get(`/donors/${id}/health-reports`);
export const getDonationHistory = (id) => api.get(`/donors/${id}/donations`);
export const getDonorAppointments = (id) => api.get(`/donors/${id}/appointments`);
export const createHealthReport = (id, data) => api.post(`/donors/${id}/health-reports`, data);
