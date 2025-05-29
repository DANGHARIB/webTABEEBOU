import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSave, faArrowLeft, faCamera, faEnvelope, faBriefcase, faClock, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
import './DoctorProfileEdit.css';

interface DoctorFormData {
  email: string;
  first_name: string;
  last_name: string;
  about?: string;
  education?: string;
  experience?: string; // Stored as string in form, converted to number on save
  price?: string;      // Stored as string in form, converted to number on save
  doctor_image_url?: string; // To display current image
}

const DoctorProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState<DoctorFormData>({
    email: '',
    first_name: '',
    last_name: '',
    about: '',
    education: '',
    experience: '',
    price: '',
    doctor_image_url: undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctorProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDoctorProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/doctor/auth/login'); // Redirect to doctor login
        return;
      }

      const response = await axios.get('/api/doctors/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        const data = response.data; // Expect { user: UserProfileDetail, profile: DoctorProfileDetail }
        console.log('[DoctorProfileEdit] Received profile data:', data); // Log the received data

        setFormData({
          email: data.user?.email || '',
          first_name: data.profile?.first_name || '', // Use snake_case from profile object
          last_name: data.profile?.last_name || '',   // Use snake_case from profile object
          about: data.profile?.about || '',
          education: data.profile?.education || '',
          experience: data.profile?.experience?.toString() || '',
          price: data.profile?.price?.toString() || '',
          doctor_image_url: data.profile?.doctor_image || data.user?.profileImage || undefined, // Use doctor_image from profile
        });
        setError(null);
      }
    } catch (error) {
      console.error('Failed to fetch doctor profile:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof DoctorFormData, value: string) => {
    setFormData(prevState => ({
      ...prevState,
      [field]: value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setIsUploadingImage(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expired. Please log in again to upload images.');
        setIsUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.put('/api/doctors/upload-image', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 200) {
        const newImageUrl = response.data.doctor.profileImage;
        setFormData(prev => ({ ...prev, doctor_image_url: newImageUrl }));
        setSuccessMessage('Profile image uploaded successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setError('Failed to upload image. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('Please fill in your first and last name.');
      return;
    }

    // Validate numeric fields
    const experienceNum = parseFloat(formData.experience || '0');
    const priceNum = parseFloat(formData.price || '0');

    if (formData.experience && isNaN(experienceNum)) {
      setError('Please enter a valid number for experience.');
      return;
    }
    if (formData.price && isNaN(priceNum)) {
      setError('Please enter a valid number for consultation fee.');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Session expired. Please log in again.');
        navigate('/doctor/auth/login');
        return;
      }

      const constructedFullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      const profileDataToSave: Record<string, string | number | undefined> = {
        fullName: constructedFullName,
        firstName: formData.first_name.trim(),
        lastName: formData.last_name.trim(),
        about: formData.about?.trim(),
        education: formData.education?.trim(),
        experience: formData.experience ? experienceNum : undefined,
        price: formData.price ? priceNum : undefined,
      };
      
      // Remove undefined fields to avoid sending them
      Object.keys(profileDataToSave).forEach(key => {
        if (profileDataToSave[key] === undefined) {
          delete profileDataToSave[key];
        }
      });

      const response = await axios.put('/api/doctors/profile', profileDataToSave, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setSuccessMessage('Your profile has been updated successfully');
        setTimeout(() => {
          setSuccessMessage(null);
          navigate('/doctor/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to update doctor profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="doctor-profile-edit">
      <div className="profile-edit-header">
        <button className="back-button" onClick={() => navigate('/doctor/profile')}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1>Edit Profile</h1>
        <div></div> {/* Empty div for spacing */}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Profile Image Section */}
        <div className="profile-image-section">
          <div className="profile-image-container">
            {formData.doctor_image_url ? (
              <img 
                src={formData.doctor_image_url} 
                alt="Profile" 
                className="profile-image" 
              />
            ) : (
              <div className="profile-image-placeholder">
                <FontAwesomeIcon icon={faUser} size="3x" />
              </div>
            )}
            <label className="camera-button" htmlFor="image-upload">
              {isUploadingImage ? (
                <div className="spinner-small"></div>
              ) : (
                <FontAwesomeIcon icon={faCamera} />
              )}
            </label>
            <input 
              type="file" 
              id="image-upload" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ display: 'none' }} 
              disabled={isUploadingImage}
            />
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="form-card">
          <div className="card-header">
            <FontAwesomeIcon icon={faUser} />
            <h2>Personal Information</h2>
          </div>
          
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="disabled-input-container">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
              <span>{formData.email}</span>
            </div>
          </div>
        </div>

        {/* Professional Information Card */}
        <div className="form-card">
          <div className="card-header">
            <FontAwesomeIcon icon={faBriefcase} />
            <h2>Professional Information</h2>
          </div>

          <div className="input-group">
            <label htmlFor="about">About Me</label>
            <textarea
              id="about"
              value={formData.about}
              onChange={(e) => handleChange('about', e.target.value)}
              placeholder="Tell patients about yourself, specialties, and approach to care"
              rows={4}
            />
          </div>

          <div className="input-group">
            <label htmlFor="education">Education & Qualifications</label>
            <textarea
              id="education"
              value={formData.education}
              onChange={(e) => handleChange('education', e.target.value)}
              placeholder="List your degrees, certifications, and institutions"
              rows={3}
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="experience">Experience (Years)</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faClock} className="input-icon" />
                <input
                  type="number"
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleChange('experience', e.target.value)}
                  placeholder="Years"
                  min="0"
                  step="1"
                />
              </div>
            </div>
            
            <div className="input-group">
              <label htmlFor="price">Consultation Fee</label>
              <div className="input-with-icon">
                <FontAwesomeIcon icon={faMoneyBill} className="input-icon" />
                <input
                  type="number"
                  id="price"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className={`save-button ${(isSaving || isLoading) ? 'disabled' : ''}`}
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <div className="spinner-small"></div>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} className="button-icon" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DoctorProfileEdit;
