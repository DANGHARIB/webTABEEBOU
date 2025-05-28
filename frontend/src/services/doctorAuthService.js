import api from './api';

/**
 * Service pour gérer l'authentification des médecins et les opérations liées
 */
const doctorAuthService = {
  /**
   * Vérifie le statut de vérification du compte du médecin
   * @returns {Promise<Object>} Objet contenant le statut de vérification
   */
  async checkVerificationStatus() {
    try {
      const response = await api.get('/doctors/verification-status');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
      
      // Si le token est invalide ou expiré, gérer l'erreur d'authentification
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('token');
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      
      throw error;
    }
  },

  /**
   * Essaie d'obtenir le statut de vérification sans token (pour les utilisateurs non connectés)
   * @param {string} userId - ID de l'utilisateur (ou email encodé)
   * @returns {Promise<Object>} Objet contenant le statut de vérification
   */
  async checkVerificationStatusByUserId(userId) {
    try {
      // Route pour vérifier le statut sans être connecté
      const response = await api.get(`/doctors/public/verification/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut public:', error);
      throw error;
    }
  },
  
  /**
   * Soumet les documents de vérification du médecin
   * @param {FormData} formData - Données du formulaire contenant les documents
   * @returns {Promise<Object>} Résultat de la soumission
   */
  async submitVerificationDocuments(formData) {
    try {
      const response = await api.post('/doctors/verification-documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la soumission des documents:', error);
      throw error;
    }
  },
  
  /**
   * Complète le profil du médecin
   * @param {Object} profileData - Données du profil à mettre à jour
   * @returns {Promise<Object>} Profil mis à jour
   */
  async completeProfile(profileData) {
    try {
      const response = await api.put('/doctors/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  },

  /**
   * Met à jour le profil du médecin avec des fichiers (certifications)
   * @param {FormData} formData - Données du formulaire incluant les fichiers
   * @returns {Promise<Object>} Profil mis à jour
   */
  async updateProfileWithFiles(formData) {
    try {
      // Récupérer le token manuellement pour s'assurer qu'il est présent
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      const response = await api.post('/doctors/profile/with-files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Réponse de mise à jour avec fichiers:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil avec fichiers:', error);
      throw error;
    }
  }
};

export default doctorAuthService;