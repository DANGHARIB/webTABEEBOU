import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Gestion des erreurs 401 (non authentifié) ou 403 (non autorisé)
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('Session expirée ou non autorisée');
        // Possibilité de rediriger vers la page de login ici
      }
      
      // Retourner un message d'erreur plus descriptif si disponible
      if (error.response.data && error.response.data.message) {
        error.message = error.response.data.message;
      }
    }
    
    return Promise.reject(error);
  }
);

// API pour les médecins
export const doctorAPI = {
  // Récupérer les disponibilités du médecin connecté
  getMyAvailability: async () => {
    const response = await api.get('/availability/my-availability');
    return response.data;
  },
  
  // Créer une disponibilité
  createAvailability: async (availabilityData) => {
    const response = await api.post('/availability', availabilityData);
    return response.data;
  },
  
  // Créer plusieurs disponibilités en une seule requête
  createBatchAvailability: async (availabilitiesData) => {
    const response = await api.post('/availability/batch', availabilitiesData);
    return response.data;
  },
  
  // Supprimer une disponibilité
  deleteAvailability: async (id) => {
    const response = await api.delete(`/availability/${id}`);
    return response.data;
  },
  
  // Récupérer les rendez-vous du médecin
  getMyAppointments: async () => {
    const response = await api.get('/appointments/doctor');
    return response.data;
  },
  
  // Mettre à jour le profil du médecin
  updateProfile: async (profileData) => {
    const response = await api.put('/doctors/profile', profileData);
    return response.data;
  },
};

// API pour les patients
export const patientAPI = {
  // Récupérer les rendez-vous du patient
  getMyAppointments: async () => {
    const response = await api.get('/appointments/patient');
    return response.data;
  },
  
  // Prendre un rendez-vous
  bookAppointment: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },
  
  // Annuler un rendez-vous
  cancelAppointment: async (id) => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  },
  
  // Mettre à jour le profil du patient
  updateProfile: async (profileData) => {
    const response = await api.put('/patients/profile', profileData);
    return response.data;
  },
  
  // Rechercher des médecins
  searchDoctors: async (searchParams) => {
    const response = await api.get('/doctors/search', { params: searchParams });
    return response.data;
  },
};

// API pour l'administrateur
export const adminAPI = {
  // Récupérer tous les utilisateurs
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  // Récupérer tous les médecins
  getAllDoctors: async () => {
    const response = await api.get('/doctors');
    return response.data;
  },
  
  // Récupérer tous les patients
  getAllPatients: async () => {
    const response = await api.get('/patients');
    return response.data;
  },
  
  // Approuver un médecin
  approveDoctor: async (id) => {
    const response = await api.put(`/doctors/${id}/approve`);
    return response.data;
  },
  
  // Rejeter un médecin
  rejectDoctor: async (id, reason) => {
    const response = await api.put(`/doctors/${id}/reject`, { reason });
    return response.data;
  },
};

export default api;