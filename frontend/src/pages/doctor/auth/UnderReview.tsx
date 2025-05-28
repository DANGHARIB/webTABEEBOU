import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UnderReview.css';

const AccountUnderReviewScreen = () => {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fonction pour vérifier le statut du compte
  const checkAccountStatus = useCallback(async () => {
    try {
      setLoading(true);
      // Récupérer le token
      const token = localStorage.getItem('doctorToken');
      
      if (!token) {
        setError("Aucune session active trouvée. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }
      
      const response = await axios.get('/api/doctors/verification-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setVerificationStatus(response.data.status);
      
      if (response.data.rejectionReason) {
        setRejectionReason(response.data.rejectionReason);
      }
      
      setError('');
    } catch (err) {
      console.error('Erreur lors de la vérification du statut:', err);
      setError("Impossible de vérifier le statut de votre compte. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Vérifier le statut périodiquement
  useEffect(() => {
    // Vérification initiale
    checkAccountStatus();
    
    // Configurer une vérification périodique
    const intervalId = setInterval(checkAccountStatus, 30000); // Vérifier toutes les 30 secondes
    
    // Nettoyer l'intervalle à la destruction du composant
    return () => clearInterval(intervalId);
  }, [checkAccountStatus]);
  
  // Gérer la redirection vers la page d'accueil quand le médecin est vérifié
  const handleLoginPress = () => {
    try {
      localStorage.setItem('userType', 'doctor');
      navigate('/doctor/auth/login');
    } catch (err) {
      console.error('Erreur lors de la navigation:', err);
    }
  };
  
  // Gérer la redirection vers la page d'inscription quand le médecin est rejeté
  const handleTryAgainPress = () => {
    try {
      // Supprimer toutes les données stockées pour recommencer à zéro
      localStorage.removeItem('userType');
      localStorage.removeItem('doctorToken');
      localStorage.removeItem('doctorData');
      localStorage.removeItem('tempUserId');
      
      navigate('/doctor/auth/signup');
    } catch (err) {
      console.error('Erreur lors de la navigation:', err);
    }
  };

  // Afficher l'écran approprié en fonction du statut de vérification
  if (verificationStatus === 'verified') {
    return (
      <div className="under-review-container">
        <div className="review-content">
          <div className="status-icon verified">✓</div>
          <h1 className="review-title">Votre compte a été vérifié!</h1>
          <p className="review-message">
            Félicitations! Votre compte médecin a été approuvé. Vous pouvez maintenant vous connecter pour commencer à utiliser la plateforme.
          </p>
          <button className="login-button" onClick={handleLoginPress}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }
  
  if (verificationStatus === 'rejected') {
    return (
      <div className="under-review-container">
        <div className="review-content">
          <div className="status-icon rejected">✗</div>
          <h1 className="review-title">Votre demande a été refusée</h1>
          <p className="review-message">
            Nous avons examiné votre demande de compte médecin et nous sommes désolés de vous informer qu'elle n'a pas été approuvée.
            {rejectionReason ? <span className="rejection-reason">Raison: {rejectionReason}</span> : ''}
          </p>
          <button className="try-again-button" onClick={handleTryAgainPress}>
            Essayer avec un nouveau compte
          </button>
        </div>
      </div>
    );
  }
  
  // État par défaut - En attente
  return (
    <div className="under-review-container">
      <div className="review-content">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : error ? (
          <div className="status-icon error">!</div>
        ) : (
          <div className="status-icon pending">⌛</div>
        )}
        
        <h1 className="review-title">
          {error ? "Erreur de connexion" : "Votre compte est en cours d'examen"}
        </h1>
        
        <p className="review-message">
          {error ? error : 
            "Vous recevrez un email avec une confirmation une fois l'examen terminé ou, si nécessaire, un email vous demandant des informations supplémentaires ou vous informant de tout problème."}
        </p>
        
        {error && (
          <button className="retry-button" onClick={checkAccountStatus}>
            Réessayer
          </button>
        )}
        
        {!error && !loading && (
          <p className="thank-you-message">Merci de votre patience!</p>
        )}
      </div>
    </div>
  );
};

export default AccountUnderReviewScreen; 