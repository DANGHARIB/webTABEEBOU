import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../../../services/api';
import type { Doctor as ApiDoctor } from '../../../types/api.types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import { faWallet, faUserMd, faSearch, faHeart, faMedkit } from '@fortawesome/free-solid-svg-icons';
import './DoctorList.css';

// API URL constants
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_SERVER_URL = API_URL.replace('/api', '');

// Helper function to convert image paths into proper URLs
const getImageUrl = (imagePath: string | undefined): string | undefined => {
  if (!imagePath || imagePath.trim() === '') return undefined;
  
  // Handle both absolute paths (from older records) and relative paths
  if (imagePath.startsWith('C:') || imagePath.startsWith('/') || imagePath.startsWith('\\')) {
    // For absolute paths, extract just the filename
    const fileName = imagePath.split(/[\\/]/).pop();
    return `${BASE_SERVER_URL}/uploads/${fileName}`;
  } else {
    // For proper relative paths
    return `${BASE_SERVER_URL}${imagePath.replace(/\\/g, '/')}`;
  }
};

// Adapting to the structure we receive from the API
interface DoctorDisplay extends Partial<ApiDoctor> {
  _id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  doctor_image?: string;
  experience: number;
  specialization?: string | { _id: string, name: string };
  price?: number;
  rating?: number;
}

function DoctorList() {
  const [savedDoctors, setSavedDoctors] = useState<DoctorDisplay[]>([]);
  const [recommendedDoctors, setRecommendedDoctors] = useState<DoctorDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendedError, setRecommendedError] = useState('');

  const fetchSavedDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await patientAPI.getSavedDoctors();
      console.log('Saved doctors data:', data);
      setSavedDoctors(data as DoctorDisplay[]);
      setLoading(false);
    } catch (err) {
      console.error('Error loading saved doctors:', err);
      setError('Unable to load your favorite doctors');
      setLoading(false);
    }
  }, []);

  const fetchRecommendedDoctors = useCallback(async () => {
    try {
      setRecommendedLoading(true);
      const data = await patientAPI.getRecommendedDoctors();
      console.log('Recommended doctors data:', data);
      
      // Debugging each doctor's specialization
      (data as DoctorDisplay[]).forEach((doctor, index) => {
        console.log(`Doctor ${index} specialization:`, JSON.stringify(doctor.specialization, null, 2));
      });
      
      setRecommendedDoctors(data as DoctorDisplay[]);
      setRecommendedLoading(false);
    } catch (err) {
      console.error('Error loading recommended doctors:', err);
      setRecommendedError('Unable to load recommendations');
      setRecommendedLoading(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchSavedDoctors();
    fetchRecommendedDoctors();
  }, [fetchSavedDoctors, fetchRecommendedDoctors]);

  const getDoctorName = (doctor: DoctorDisplay) => {
    if (doctor.full_name) return doctor.full_name;
    return `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
  };

  const handleExploreDoctor = (doctorId: string) => {
    // This will be handled by the Link component
    console.log('Exploring doctor:', doctorId);
  };

  const renderRatingStars = (rating: number = 4) => {
    const stars = [];
    const maxStars = 5;
    
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <FontAwesomeIcon 
          key={i} 
          icon={i <= rating ? solidStar : regularStar} 
          className="rating-star"
        />
      );
    }
    
    return <div className="rating-container">{stars}</div>;
  };

  const renderDoctorItem = (doctor: DoctorDisplay) => {
    console.log('Rendering doctor item:', doctor);
    
    return (
      <div key={doctor._id} className="doctor-card">
        {doctor.doctor_image ? (
          <img 
            src={getImageUrl(doctor.doctor_image)} 
            alt={`Dr. ${getDoctorName(doctor)}`}
            className="doctor-image"
          />
        ) : (
          <div className="doctor-image doctor-image-placeholder">
            <FontAwesomeIcon icon={faUserMd} />
          </div>
        )}
        
        <div className="doctor-info">
          <h3 className="doctor-name">Dr. {getDoctorName(doctor)}</h3>
          <p className="specialization">
            {typeof doctor.specialization === 'object' && doctor.specialization !== null 
              ? doctor.specialization.name 
              : typeof doctor.specialization === 'string' && doctor.specialization 
                ? doctor.specialization 
                : 'General Practitioner'}
          </p>
          {renderRatingStars(doctor.rating)}
          <p className="doctor-experience">
            {doctor.experience} {doctor.experience > 1 ? 'Years' : 'Year'} experience
          </p>
          <div className="price-container">
            <FontAwesomeIcon icon={faWallet} className="price-icon" />
            <span className="price-text">
              {doctor.price && doctor.price > 0 ? `${doctor.price.toFixed(0)}€/hr` : 'Price unavailable'}
            </span>
          </div>
        </div>
        
        <Link 
          to={`/patient/doctor/${doctor._id}`} 
          className="explore-button"
          onClick={() => handleExploreDoctor(doctor._id)}
        >
          Explore
        </Link>
      </div>
    );
  };

  const renderEmptyState = (message: string, icon: React.ReactNode, hint: string) => (
    <div className="empty-container">
      {icon}
      <h3 className="no-results">{message}</h3>
      <p className="no-results-hint">{hint}</p>
    </div>
  );

  return (
    <div className="doctor-list-container">
      <div className="header">
        <h1 className="title">Find a Doctor</h1>
        <p className="subtitle">Your healthcare specialists</p>
      </div>
      
      <div className="content">
        {/* Recommended Doctors Section */}
        <section className="section-container">
          <h2 className="section-title">Recommended for you</h2>
          
          {recommendedLoading ? (
            <div className="loader">
              <div className="pulse-container">
                <div className="pulse-bubble pulse-bubble-1"></div>
                <div className="pulse-bubble pulse-bubble-2"></div>
                <div className="pulse-bubble pulse-bubble-3"></div>
              </div>
            </div>
          ) : recommendedError ? (
            <div className="error-container">
              <FontAwesomeIcon icon={faMedkit} size="3x" className="error-icon" />
              <p className="error-text">{recommendedError}</p>
              <button className="retry-button" onClick={fetchRecommendedDoctors}>Retry</button>
            </div>
          ) : recommendedDoctors.length === 0 ? (
            renderEmptyState(
              "No recommendations yet", 
              <FontAwesomeIcon icon={faSearch} size="3x" className="empty-icon" />,
              "Complete your assessment to get personalized recommendations"
            )
          ) : (
            <div className="doctors-grid">
              {recommendedDoctors.map(renderDoctorItem)}
            </div>
          )}
        </section>

        {/* Favorite Doctors Section */}
        <section className="section-container">
          <h2 className="section-title">Your favorite doctors</h2>
          
          {loading ? (
            <div className="loader">
              <div className="pulse-container">
                <div className="pulse-bubble pulse-bubble-1"></div>
                <div className="pulse-bubble pulse-bubble-2"></div>
                <div className="pulse-bubble pulse-bubble-3"></div>
              </div>
            </div>
          ) : error ? (
            <div className="error-container">
              <FontAwesomeIcon icon={faMedkit} size="3x" className="error-icon" />
              <p className="error-text">{error}</p>
              <button className="retry-button" onClick={fetchSavedDoctors}>Retry</button>
            </div>
          ) : savedDoctors.length === 0 ? (
            renderEmptyState(
              "No favorites yet", 
              <FontAwesomeIcon icon={faHeart} size="3x" className="empty-icon" />,
              "Save doctors to find them here"
            )
          ) : (
            <div className="doctors-grid">
              {savedDoctors.map(renderDoctorItem)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DoctorList;
