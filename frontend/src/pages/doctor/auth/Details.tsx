import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import type { FileWithPath } from 'react-dropzone';
import axios from 'axios';
import doctorAuthService from '../../../services/doctorAuthService';
import './Details.css';

interface DateOfBirth {
  day: string;
  month: string;
  year: string;
}

interface Specialization {
  _id: string;
  name: string;
}

interface FormData {
  fullName: string;
  dateOfBirth: DateOfBirth;
  specialization: string;
  selectedFiles: FileWithPath[];
}

interface ApiError extends Error {
  response?: {
    status: number;
    data?: { message?: string };
  };
  request?: unknown;
  message: string;
}

const DoctorDetailsScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    dateOfBirth: { day: '', month: '', year: '' },
    specialization: '',
    selectedFiles: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false);

  // État pour stocker les spécialisations récupérées de l'API
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);

  // Vérifier l'authentification au chargement du composant
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé, redirection vers la page de connexion');
      navigate('/doctor/auth/login');
      return;
    }
    
    // Configurer explicitement le header d'autorisation pour les futures requêtes
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Token trouvé et configuré dans Details.tsx:', !!token);
    
    // Récupérer les informations utilisateur si disponibles
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const userData = JSON.parse(userInfo);
        console.log('Informations utilisateur chargées:', userData.email);
        
        // Pré-remplir le formulaire avec le nom si disponible
        if (userData.fullName) {
          setFormData(prev => ({
            ...prev,
            fullName: userData.fullName
          }));
        }
      } catch (e) {
        console.error('Erreur lors du chargement des infos utilisateur:', e);
      }
    }
  }, [navigate]);

  // Configuration de react-dropzone pour le téléchargement de fichiers
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true,
    onDrop: (acceptedFiles: FileWithPath[]) => {
      const filesWithPreview = acceptedFiles.map(file => {
        const fileWithPreview = Object.assign(file, {
          preview: URL.createObjectURL(file)
        });
        return fileWithPreview as FileWithPath & { preview: string };
      });
      
      setFormData(prev => ({
        ...prev,
        selectedFiles: [...prev.selectedFiles, ...filesWithPreview]
      }));
    }
  });

  // Récupérer les spécialisations au chargement du composant
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        setLoadingSpecializations(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await axios.get(`${apiUrl}/specializations`);
        setSpecializations(response.data);
        setLoadingSpecializations(false);
      } catch (err) {
        console.error('Failed to fetch specializations:', err);
        setError('Failed to load specializations. Please try again.');
        setLoadingSpecializations(false);
      }
    };

    fetchSpecializations();
  }, []);

  // Nettoyage des URLs d'aperçu lors du démontage du composant
  useEffect(() => {
    return () => {
      formData.selectedFiles.forEach(file => {
        const fileWithPreview = file as FileWithPath & { preview?: string };
        if (fileWithPreview.preview) URL.revokeObjectURL(fileWithPreview.preview);
      });
    };
  }, [formData.selectedFiles]);

  const updateFormField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateDateField = (field: keyof DateOfBirth, value: string) => {
    setFormData(prev => ({
      ...prev,
      dateOfBirth: { ...prev.dateOfBirth, [field]: value }
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const first_name = formData.fullName.split(' ')[0] || '';
    const last_name = formData.fullName.split(' ').slice(1).join(' ') || '';
    
    if (!formData.fullName || !formData.dateOfBirth.day || !formData.dateOfBirth.month || !formData.dateOfBirth.year || !formData.specialization) {
      setError('Veuillez remplir tous les champs obligatoires (Nom complet, Date de naissance, Spécialisation).');
      return;
    }

    const dob = `${formData.dateOfBirth.year}-${String(formData.dateOfBirth.month).padStart(2, '0')}-${String(formData.dateOfBirth.day).padStart(2, '0')}`;

    setIsLoading(true);
    setError('');

    const dataToSubmit = new FormData();
    dataToSubmit.append('full_name', formData.fullName);
    dataToSubmit.append('first_name', first_name);
    dataToSubmit.append('last_name', last_name);
    dataToSubmit.append('date_of_birth', dob);
    dataToSubmit.append('specialization', formData.specialization);
    
    // Ajouter chaque fichier au FormData
    formData.selectedFiles.forEach((file) => {
      dataToSubmit.append('certificationFiles', file);
    });

    console.log('Envoi des données du profil médecin...');
    console.log('Token d\'authentification présent:', !!localStorage.getItem('token'));
    console.log('Spécialisation sélectionnée:', formData.specialization);
    console.log('Nombre de fichiers:', formData.selectedFiles.length);
    
    try {
      // Reconfigurer le token juste avant l'envoi pour s'assurer qu'il est présent
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/doctor/auth/login'), 2000);
        return;
      }
      
      // Utiliser le service pour envoyer les données avec les fichiers
      const response = await doctorAuthService.updateProfileWithFiles(dataToSubmit);
      
      console.log('Profil médecin mis à jour avec succès:', response);
      
      // Stocker l'information que le profil a été complété
      localStorage.setItem('doctorProfileCompleted', 'true');
      
      // Rediriger vers la page d'attente de vérification
      navigate('/doctor/auth/under-review');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('❌ Erreur lors de la mise à jour du profil médecin:', error);
      
      if (apiError.response) {
        if (apiError.response.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
          setTimeout(() => navigate('/doctor/auth/login'), 2000);
          return;
        } else if (apiError.response.status === 413) {
          setError('Les fichiers téléchargés sont trop volumineux. Veuillez réduire leur taille.');
        } else {
          setError(apiError.response.data?.message || 'Erreur lors de la mise à jour du profil. Veuillez réessayer.');
        }
      } else if (apiError.request) {
        console.error('Aucune réponse reçue:', apiError.request);
        setError('Problème de connexion au serveur. Veuillez vérifier votre connexion internet.');
      } else {
        console.error('Erreur de configuration:', apiError.message);
        setError('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    { label: 'January', value: '01' }, { label: 'February', value: '02' }, { label: 'March', value: '03' },
    { label: 'April', value: '04' }, { label: 'May', value: '05' }, { label: 'June', value: '06' },
    { label: 'July', value: '07' }, { label: 'August', value: '08' }, { label: 'September', value: '09' },
    { label: 'October', value: '10' }, { label: 'November', value: '11' }, { label: 'December', value: '12' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  // Fonction pour obtenir le nom de la spécialisation à partir de son ID
  const getSpecializationName = (specializationId: string): string => {
    const specialization = specializations.find(spec => spec._id === specializationId);
    return specialization ? specialization.name : 'Select Specialization';
  };

  const removeFile = (fileToRemove: FileWithPath) => {
    setFormData(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter(file => file !== fileToRemove)
    }));
  };

  return (
    <div className="doctor-details-container">
      <div className="doctor-details-content">
        <h1 className="doctor-details-title">Doctor's Details</h1>

        <form onSubmit={handleSubmit} className="doctor-details-form">
          <div className="form-group">
            <label className="input-label">Full Name</label>
            <input
              className="text-input"
              type="text"
              placeholder="Dr. Lorem Ipsum"
              value={formData.fullName}
              onChange={(e) => updateFormField('fullName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="input-label">Date of Birth</label>
            <div className="date-container">
              <div className="date-dropdown">
                <div 
                  className="date-button" 
                  onClick={() => setShowDayDropdown(!showDayDropdown)}
                >
                  <span>{formData.dateOfBirth.day || 'Day'}</span>
                  <i className="chevron-down"></i>
                </div>
                {showDayDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-scroll">
                      {days.map((day) => (
                        <div 
                          key={day} 
                          className="dropdown-item" 
                          onClick={() => { 
                            updateDateField('day', day); 
                            setShowDayDropdown(false); 
                          }}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="date-dropdown">
                <div 
                  className="date-button" 
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                >
                  <span>
                    {months.find(m => m.value === formData.dateOfBirth.month)?.label || 'Month'}
                  </span>
                  <i className="chevron-down"></i>
                </div>
                {showMonthDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-scroll">
                      {months.map((month) => (
                        <div 
                          key={month.value} 
                          className="dropdown-item" 
                          onClick={() => { 
                            updateDateField('month', month.value); 
                            setShowMonthDropdown(false); 
                          }}
                        >
                          {month.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="date-dropdown">
                <div 
                  className="date-button" 
                  onClick={() => setShowYearDropdown(!showYearDropdown)}
                >
                  <span>{formData.dateOfBirth.year || 'Year'}</span>
                  <i className="chevron-down"></i>
                </div>
                {showYearDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-scroll">
                      {years.map((year) => (
                        <div 
                          key={year} 
                          className="dropdown-item" 
                          onClick={() => { 
                            updateDateField('year', year); 
                            setShowYearDropdown(false); 
                          }}
                        >
                          {year}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Specialization</label>
            <div 
              className="dropdown-button" 
              onClick={() => setShowSpecializationDropdown(!showSpecializationDropdown)}
            >
              <span>
                {loadingSpecializations 
                  ? 'Loading specializations...' 
                  : formData.specialization 
                    ? getSpecializationName(formData.specialization) 
                    : 'Select Specialization'}
              </span>
              <i className="chevron-down"></i>
            </div>
            {showSpecializationDropdown && !loadingSpecializations && (
              <div className="dropdown-menu-full-width">
                <div className="dropdown-scroll">
                  {specializations.map((spec) => (
                    <div
                      key={spec._id}
                      className="dropdown-item"
                      onClick={() => {
                        updateFormField('specialization', spec._id);
                        setShowSpecializationDropdown(false);
                      }}
                    >
                      {spec.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loadingSpecializations && (
              <div className="loading-spinner"></div>
            )}
          </div>

          <div className="form-group">
            <label className="input-label">Certifications</label>
            <div {...getRootProps({ className: 'dropzone' })}>
              <input {...getInputProps()} />
              <p>Upload Certifications (PDF/Image)</p>
              <button type="button" className="upload-btn">
                Browse Files
              </button>
            </div>
            
            {formData.selectedFiles.length > 0 && (
              <div className="file-list-container">
                <p className="file-list-title">Selected Files:</p>
                {formData.selectedFiles.map((file, index) => (
                  <div key={index} className="file-list-item">
                    <i className="document-icon"></i>
                    <span className="file-name">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </span>
                    <button 
                      type="button" 
                      className="remove-file-btn" 
                      onClick={() => removeFile(file)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            SUBMIT DETAILS
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorDetailsScreen;