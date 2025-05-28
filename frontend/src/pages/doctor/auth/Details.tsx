import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './Details.css';

const DoctorDetailsScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
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
  const [specializations, setSpecializations] = useState([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);

  // Configuration de react-dropzone pour le téléchargement de fichiers
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true,
    onDrop: acceptedFiles => {
      setFormData(prev => ({ 
        ...prev, 
        selectedFiles: [...prev.selectedFiles, ...acceptedFiles.map(file => 
          Object.assign(file, {
            preview: URL.createObjectURL(file)
          })
        )] 
      }));
    }
  });

  // Récupérer les spécialisations au chargement du composant
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        setLoadingSpecializations(true);
        const response = await axios.get('/api/specializations');
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
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [formData.selectedFiles]);

  const updateFormField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateDateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dateOfBirth: { ...prev.dateOfBirth, [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let first_name = formData.fullName.split(' ')[0] || '';
    let last_name = formData.fullName.split(' ').slice(1).join(' ') || '';
    
    if (!formData.fullName || !formData.dateOfBirth.day || !formData.dateOfBirth.month || !formData.dateOfBirth.year || !formData.specialization) {
      setError('Please fill all required fields (Full Name, Date of Birth, Specialization).');
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
    
    formData.selectedFiles.forEach((file) => {
      dataToSubmit.append('certificationFiles', file);
    });

    console.log('⏳ Envoi des données du profil médecin...');
    
    try {
      const response = await axios.put('/api/doctors/profile', dataToSubmit, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Profil médecin mis à jour avec succès:', response.data);
      
      // Stocker l'information que le profil a été complété
      localStorage.setItem('doctorProfileCompleted', 'true');
      
      // Rediriger vers la page d'attente de vérification
      navigate('/doctor/auth/under-review');
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour du profil médecin:', err);
      
      if (err.response) {
        if (err.response.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
          setTimeout(() => navigate('/doctor/auth/login'), 2000);
          return;
        } else if (err.response.status === 413) {
          setError('Les fichiers téléchargés sont trop volumineux. Veuillez réduire leur taille.');
        } else {
          setError(err.response.data?.message || 'Erreur lors de la mise à jour du profil. Veuillez réessayer.');
        }
      } else if (err.request) {
        console.error('Aucune réponse reçue:', err.request);
        setError('Problème de connexion au serveur. Veuillez vérifier votre connexion internet.');
      } else {
        console.error('Erreur de configuration:', err.message);
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
  const getSpecializationName = (specializationId) => {
    const specialization = specializations.find(spec => spec._id === specializationId);
    return specialization ? specialization.name : 'Select Specialization';
  };

  const removeFile = (fileToRemove) => {
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
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? <div className="submit-spinner"></div> : 'SUBMIT DETAILS'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorDetailsScreen; 