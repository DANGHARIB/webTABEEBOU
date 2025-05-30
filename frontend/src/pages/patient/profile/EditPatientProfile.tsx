import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faChevronLeft, 
  faSave
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

import './EditPatientProfile.css';

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: Date;
}

const EditPatientProfile: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<FormData, 'fullName'>>({
    email: '',
    first_name: '',
    last_name: '',
    gender: 'Male',
    date_of_birth: new Date(),
  });

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const userToken = localStorage.getItem('token');
      if (!userToken) {
        navigate('/patient/login');
        return;
      }

      const response = await axios.get('/api/patients/profile', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.status === 200) {
        const data = response.data;
        setFormData({
          email: data.user?.email || '',
          first_name: data.profile?.first_name || data.user?.fullName?.split(' ')[0] || '',
          last_name: data.profile?.last_name || data.user?.fullName?.split(' ').slice(1).join(' ') || '',
          gender: data.profile?.gender || 'Male',
          date_of_birth: data.profile?.date_of_birth ? new Date(data.profile.date_of_birth) : new Date(),
        });
      } else {
        const userInfoString = localStorage.getItem('userInfo');
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          setFormData({
            email: userInfo.email || '',
            first_name: userInfo.profile?.first_name || userInfo.fullName?.split(' ')[0] || '',
            last_name: userInfo.profile?.last_name || userInfo.fullName?.split(' ').slice(1).join(' ') || '',
            gender: userInfo.profile?.gender || 'Male',
            date_of_birth: userInfo.profile?.date_of_birth ? new Date(userInfo.profile.date_of_birth) : new Date(),
          });
        } else {
          alert('Could not retrieve profile information (API and local).');
        }
        console.error("API error fetching profile:", response.statusText);
        if (response.status !== 404) {
          alert('Network Error: Could not connect to the server to retrieve the profile.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      alert('An error occurred while retrieving the profile.');
      const userInfoString = localStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setFormData({
          email: userInfo.email || '',
          first_name: userInfo.profile?.first_name || userInfo.fullName?.split(' ')[0] || '',
          last_name: userInfo.profile?.last_name || userInfo.fullName?.split(' ').slice(1).join(' ') || '',
          gender: userInfo.profile?.gender || 'Male',
          date_of_birth: userInfo.profile?.date_of_birth ? new Date(userInfo.profile.date_of_birth) : new Date(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);
  
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleChange = (field: keyof Omit<FormData, 'date_of_birth' | 'gender' | 'email'>, value: string) => {
    setFormData(prevState => ({
      ...prevState,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      alert('Please fill in your first and last name.');
      return;
    }

    try {
      setIsSaving(true);
      const userToken = localStorage.getItem('token');
      
      if (!userToken) {
        alert('Session Expired. Please log in again.');
        navigate('/patient/login');
        return;
      }

      const constructedFullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      const profileData = {
        fullName: constructedFullName,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      };

      // Show optimistic UI feedback
      const saveButton = document.querySelector('.save-button');
      if (saveButton) {
        saveButton.classList.add('saving');
      }

      const response = await axios.put('/api/patients/profile', profileData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.status === 200) {
        const updatedProfileInfo = response.data;
        const storedUserInfoString = localStorage.getItem('userInfo');
        let updatedLocalStorageUser;

        if (storedUserInfoString) {
          const storedUserInfo = JSON.parse(storedUserInfoString);
          // Create a complete updated user object with all necessary properties
          updatedLocalStorageUser = {
            ...storedUserInfo, 
            name: constructedFullName, // Add this to ensure compatibility with both name and fullName properties
            fullName: constructedFullName,
            email: updatedProfileInfo.email || storedUserInfo.email, 
            profile: {
              ...(storedUserInfo.profile || {}),
              ...(updatedProfileInfo.profile || {}),
              first_name: formData.first_name.trim(), // Use the actual form data to ensure consistency
              last_name: formData.last_name.trim(),
              gender: formData.gender,
              date_of_birth: formData.date_of_birth, 
            }
          };
        } else {
          // If no existing userInfo, create a new one with all available data
          updatedLocalStorageUser = {
            ...updatedProfileInfo,
            name: constructedFullName,
            fullName: constructedFullName,
            profile: {
              ...(updatedProfileInfo.profile || {}),
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              gender: formData.gender,
              date_of_birth: formData.date_of_birth,
            }
          };
        }
        
        // Ensure consistent data in localStorage
        localStorage.setItem('userInfo', JSON.stringify(updatedLocalStorageUser));
        
        // Force refresh of localStorage by removing and resetting the user info
        localStorage.removeItem('userInfo');
        localStorage.setItem('userInfo', JSON.stringify(updatedLocalStorageUser));
        
        // Update all relevant user information
        localStorage.setItem('userName', constructedFullName);
        
        // Create a custom event to notify other components about the profile update
        const profileUpdateEvent = new CustomEvent('profileUpdated', {
          detail: { fullName: constructedFullName }
        });
        window.dispatchEvent(profileUpdateEvent);
        
        // Show success message
        alert('Your profile has been updated successfully.');
        
        // Navigate back to the profile page
        navigate('/patient/profile');
      } else {
        alert('An error occurred while updating the profile.');
        console.error("API error updating profile:", response.statusText);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="edit-profile-loading">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-header">
        <h1 className="header-title">Edit Profile</h1>
        <button onClick={() => navigate('/patient/profile')} className="back-button">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      </div>
      
      <div className="edit-profile-content">
        {/* Profile Image Section */}
        <div className="profile-image-section">
          <div className="profile-image-container">
            <div className="profile-image-placeholder">
              <FontAwesomeIcon icon={faUser} className="user-icon" />
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="information-section">
          <div className="section-header">
            <FontAwesomeIcon icon={faUser} className="section-icon" />
            <span className="section-title">Personal Information</span>
          </div>
          
          <div className="form-fields">
            <div className="input-row">
              <div className="field-container">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="First name"
                />
              </div>
              
              <div className="field-container">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="field-container">
              <label>Email</label>
              <div className="disabled-input-container">
                {formData.email}
              </div>
            </div>

            <div className="field-container">
              <label>Gender</label>
              <div className="disabled-input-container">
                {formData.gender}
              </div>
            </div>

            <div className="field-container">
              <label>Date of Birth</label>
              <div className="disabled-input-container">
                {formData.date_of_birth.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <button 
          className="save-button"
          onClick={handleSave}
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
      </div>
    </div>
  );
};

export default EditPatientProfile;
