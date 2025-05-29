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
  Payment, // Added Payment type
  User,
  DoctorProfileApiResponse // Added import for the new type
} from '../types/api.types';

// Type for Patient in notes
interface NotePatient {
  _id: string;
  first_name?: string;
  last_name?: string;
  user?: {
    fullName?: string;
    _id?: string;
  };
}

// Type for Appointment in notes
interface NoteAppointment {
  _id: string;
  patient: NotePatient;
  slotStartTime: string;
  slotEndTime: string;
  caseDetails?: string;
  availability: {
    date: string;
  };
}

// Type for Appointment Notes
interface AppointmentNote {
  _id: string;
  appointment: NoteAppointment | string; // Can be either populated or just the ID
  doctor: string;
  patient: NotePatient | string; // Can be either populated or just the ID
  content: string;
  diagnosis?: string;
  treatment?: string;
  advice?: string;
  followUp?: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      
      // Enhanced logging for debugging
      console.log('API Request:', config.method?.toUpperCase(), config.url);
      console.log('Request headers:', config.headers);
      
      // Extra logging for appointment-related endpoints
      if (config.url?.includes('/appointments/') || config.url?.includes('/appointment-notes/')) {
        console.log('Authorization header for appointment request:', config.headers.Authorization);
        console.log('Full request config:', {
          method: config.method,
          url: API_URL + config.url,
          headers: config.headers,
          data: config.data
        });
      }
    } else if (config.url?.includes('/doctors/profile') || config.url?.includes('/appointments/doctor')) {
      console.warn('Token manquant pour une requête qui nécessite une authentification:', config.url, 'Token value:', token);
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
  
  // Récupérer le profil du médecin connecté
  getProfile: async (): Promise<DoctorProfileApiResponse> => { // Changed return type
    const response = await api.get('/doctors/profile'); // Assuming this endpoint exists
    return response.data;
  },

  // Récupérer les rendez-vous du médecin
  getAppointments: async (): Promise<ApiResponse<Appointment[]>> => {
    const response = await api.get('/appointments/doctor/me');
    return response.data;
  },

  // Mettre à jour le statut d'un rendez-vous
  updateAppointmentStatus: async (appointmentId: string, payload: { status: string }): Promise<ApiResponse<Appointment>> => {
    const response = await api.put(`/appointments/${appointmentId}/status`, payload);
    return response.data;
  },

  // Demander une reprogrammation d'un rendez-vous
  requestRescheduleAppointment: async (appointmentId: string): Promise<ApiResponse<Appointment>> => {
    const response = await api.post(`/appointments/${appointmentId}/request-reschedule`);
    return response.data;
  },

  // Vérifier si une note existe pour un rendez-vous
  checkNoteExists: async (appointmentId: string): Promise<ApiResponse<{ exists: boolean; noteId?: string }>> => {
    try {
      console.log(`Checking if note exists for appointment ID: ${appointmentId}`);
      const response = await api.get(`/appointment-notes/check/${appointmentId}`);
      console.log('Note exists response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking if note exists:', error);
      throw error;
    }
  },

  // Récupérer un rendez-vous par ID
  getAppointmentById: async (appointmentId: string): Promise<Appointment> => {
    try {
      console.log(`Fetching appointment with ID: ${appointmentId}`);
      const url = `/appointments/${appointmentId}`;
      console.log(`Using URL: ${url}`);
      
      const response = await api.get(url);
      console.log('Appointment response:', response);
      
      // The backend is returning the appointment object directly, not wrapped in ApiResponse
      return response.data;
    } catch (error) {
      console.error('Error in getAppointmentById:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        });
      }
      throw error;
    }
  },

  // Créer une note pour un rendez-vous
  createAppointmentNote: async (noteData: {
    appointmentId: string | null;
    content: string;
    diagnosis?: string;
    treatment?: string;
    advice?: string;
    followUp?: string;
  }): Promise<ApiResponse<AppointmentNote>> => {
    try {
      console.log('Creating appointment note with data:', noteData);
      const response = await api.post('/appointment-notes', noteData);
      console.log('Create note response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating appointment note:', error);
      throw error;
    }
  },

  // Récupérer une note par ID
  getNoteById: async (noteId: string): Promise<AppointmentNote> => {
    try {
      console.log(`Fetching note with ID: ${noteId}`);
      const response = await api.get(`/appointment-notes/${noteId}`);
      console.log('Get note response:', response.data);
      
      // The backend is returning the note object directly, not wrapped in ApiResponse
      return response.data;
    } catch (error) {
      console.error('Error fetching note:', error);
      throw error;
    }
  },

  // Mettre à jour une note
  updateAppointmentNote: async (noteId: string, noteData: {
    content: string;
    diagnosis?: string;
    treatment?: string;
    advice?: string;
    followUp?: string;
  }): Promise<AppointmentNote> => {
    try {
      console.log(`Updating note with ID: ${noteId}`, noteData);
      const response = await api.put(`/appointment-notes/${noteId}`, noteData);
      console.log('Update note response:', response.data);
      
      // The backend is returning the note object directly, not wrapped in ApiResponse
      return response.data;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  },

  // Vérifier si une note existe pour un rendez-vous
  checkNoteExists: async (appointmentId: string): Promise<{exists: boolean; noteId?: string}> => {
    try {
      console.log('Checking if note exists for appointment:', appointmentId);
      const response = await api.get(`/appointment-notes/check/${appointmentId}`);
      console.log('Check note exists response:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error checking if note exists:', err);
      return { exists: false };
    }
  },
  
  // Mettre à jour le profil du médecin
  updateProfile: async (profileData: ProfileData): Promise<ApiResponse<Doctor>> => {
    const response = await api.put('/doctors/profile', profileData);
    return response.data;
  },
  
  // Récupérer les paiements du médecin
  getDoctorPayments: async (): Promise<ApiResponse<Payment[]>> => {
    const response = await api.get('/payments/doctor'); // Assuming this is the endpoint
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