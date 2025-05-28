import api from './api';

/**
 * Service pour gérer l'authentification des utilisateurs
 */
export const authService = {
  // Inscription d'un nouvel utilisateur
  register: async (userData, role = 'patient') => {
    try {
      const response = await api.post(`/auth/${role}/register`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur lors de l\'inscription' };
    }
  },

  // Vérification du code OTP
  verifyOtp: async (email, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Code OTP invalide' };
    }
  },

  // Renvoi du code OTP
  resendOtp: async (email) => {
    try {
      const response = await api.post('/auth/resend-otp', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur lors du renvoi du code' };
    }
  },

  // Connexion
  login: async (credentials, role = 'patient') => {
    try {
      const response = await api.post(`/auth/${role}/login`, credentials);
      
      // Stocker le token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userRole', role);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Identifiants incorrects' };
    }
  },

  // Déconnexion
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Récupérer le profil de l'utilisateur connecté
  getUserProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur lors de la récupération du profil' };
    }
  },

  // Mettre à jour le mot de passe
  updatePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur lors de la mise à jour du mot de passe' };
    }
  },

  // Demander la réinitialisation du mot de passe
  requestPasswordReset: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur lors de la demande de réinitialisation' };
    }
  },

  // Réinitialiser le mot de passe avec un token
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur lors de la réinitialisation du mot de passe' };
    }
  },
};

export default authService;