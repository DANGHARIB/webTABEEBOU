import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { 
  AvailabilityData, 
  AppointmentData, 
  ProfileData, 
  SearchParams, 
  ApiResponse,
  Doctor,
  Patient,
  Appointment,
  User
} from '../types/api.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log pour le debug
      if (config.url?.includes('/doctors/profile') || config.url?.includes('/auth')) {
        console.log('Requête avec authentification:', config.method?.toUpperCase(), config.url);
        console.log('Token présent:', !!token);
      }
    } else if (config.url?.includes('/doctors/profile')) {
      console.warn('Token manquant pour une requête qui nécessite une authentification:', config.url);
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: unknown) => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      // Gestion des erreurs 401 (non authentifié) ou 403 (non autorisé)
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        console.log('Session expirée ou non autorisée');
        // Possibilité de rediriger vers la page de login ici
      }
      
      // Retourner un message d'erreur plus descriptif si disponible
      if (axiosError.response?.data?.message && error instanceof Error) {
        error.message = axiosError.response.data.message;
      }
    }
    
    return Promise.reject(error);
  }
);

// API pour les médecins
export const doctorAPI = {
  // Récupérer les disponibilités du médecin connecté
  getMyAvailability: async (): Promise<ApiResponse<AvailabilityData[]>> => {
    const response = await api.get('/availability/my-availability');
    return response.data;
  },
  
  // Créer une disponibilité
  createAvailability: async (availabilityData: AvailabilityData): Promise<ApiResponse<AvailabilityData>> => {
    const response = await api.post('/availability', availabilityData);
    return response.data;
  },
  
  // Créer plusieurs disponibilités en une seule requête
  createBatchAvailability: async (availabilitiesData: AvailabilityData[]): Promise<ApiResponse<AvailabilityData[]>> => {
    const response = await api.post('/availability/batch', availabilitiesData);
    return response.data;
  },
  
  // Supprimer une disponibilité
  deleteAvailability: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.delete(`/availability/${id}`);
    return response.data;
  },
  
  // Récupérer les rendez-vous du médecin
  getMyAppointments: async (): Promise<ApiResponse<Appointment[]>> => {
    const response = await api.get('/appointments/doctor');
    return response.data;
  },
  
  // Mettre à jour le profil du médecin
  updateProfile: async (profileData: ProfileData): Promise<ApiResponse<Doctor>> => {
    const response = await api.put('/doctors/profile', profileData);
    return response.data;
  },
};

// API pour les patients
export const patientAPI = {
  // Récupérer les rendez-vous du patient
  getMyAppointments: async (): Promise<ApiResponse<Appointment[]>> => {
    const response = await api.get('/appointments/patient');
    return response.data;
  },
  
  // Prendre un rendez-vous
  bookAppointment: async (appointmentData: AppointmentData): Promise<ApiResponse<Appointment>> => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },
  
  // Annuler un rendez-vous
  cancelAppointment: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  },
  
  // Mettre à jour le profil du patient
  updateProfile: async (profileData: ProfileData): Promise<ApiResponse<Patient>> => {
    const response = await api.put('/patients/profile', profileData);
    return response.data;
  },
  
  // Rechercher des médecins
  searchDoctors: async (searchParams: SearchParams): Promise<ApiResponse<Doctor[]>> => {
    const response = await api.get('/doctors/search', { params: searchParams });
    return response.data;
  },
};

// API pour l'administrateur
export const adminAPI = {
  // Récupérer tous les utilisateurs
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await api.get('/users');
    return response.data;
  },
  
  // Récupérer tous les médecins
  getAllDoctors: async (): Promise<ApiResponse<Doctor[]>> => {
    const response = await api.get('/doctors');
    return response.data;
  },
  
  // Récupérer tous les patients
  getAllPatients: async (): Promise<ApiResponse<Patient[]>> => {
    const response = await api.get('/patients');
    return response.data;
  },
  
  // Approuver un médecin
  approveDoctor: async (id: string): Promise<ApiResponse<Doctor>> => {
    const response = await api.put(`/doctors/${id}/approve`);
    return response.data;
  },
  
  // Rejeter un médecin
  rejectDoctor: async (id: string, reason: string): Promise<ApiResponse<Doctor>> => {
    const response = await api.put(`/doctors/${id}/reject`, { reason });
    return response.data;
  },
};

export default api;