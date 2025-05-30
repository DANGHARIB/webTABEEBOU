import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faCreditCard, faChevronRight, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

import { AuthContext } from '../../../contexts/AuthContext';
import './PatientProfile.css';

interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  fullName?: string;
  hasCompletedAssessment?: boolean;
}

interface MenuItemProps {
  id: string;
  title: string;
  description: string;
  icon: typeof faUser | typeof faCreditCard | typeof faChevronRight | typeof faSignOutAlt; // Proper type for FontAwesome icons
  iconBackgroundClass: string;
  iconColorClass: string;
  onPress: () => void;
}

const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  const [userName, setUserName] = useState('Patient');
  
  // Safely destructure with fallback for potentially undefined authContext
  const { user: authUser, logout } = authContext || {};
  
  // Function to fetch and update user info from localStorage and directly from API if needed
  const updateUserInfoFromStorage = useCallback(() => {
    console.log("Updating user info from localStorage and API...");
    
    // First check if there's a direct userName override in localStorage
    const directUserName = localStorage.getItem('userName');
    if (directUserName) {
      console.log("Found direct userName in localStorage:", directUserName);
      setUserName(directUserName);
      return;
    }
    
    try {
      // Force a fresh read from localStorage by clearing any cache
      const userInfoString = localStorage.getItem('userInfo');
      if (userInfoString) {
        // Parse with a timestamp to avoid browser caching
        const userInfo: UserInfo = JSON.parse(userInfoString + `_${new Date().getTime()}`.slice(0,0));
        
        let displayName = 'Patient';
        
        // First try to use the name property directly
        if (userInfo.name) {
          displayName = userInfo.name;
        } 
        // Fall back to fullName if name is not available
        else if (userInfo.fullName) {
          displayName = userInfo.fullName;
        } 
        // Fall back to auth context user if both are not available
        else if (authUser?.name) {
          displayName = authUser.name;
        }
        setUserName(displayName);
        console.log("Set userName from userInfo to:", displayName);
      } else if (authUser?.name) {
        setUserName(authUser.name);
        console.log("Set userName from authUser to:", authUser.name);
      }
      
      // As a backup, also try to fetch the profile from the API
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/patients/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (response.ok) return response.json();
          throw new Error('API request failed');
        })
        .then(data => {
          console.log("Got fresh profile data from API");
          if (data.fullName || (data.profile && (data.profile.first_name || data.profile.last_name))) {
            const apiName = data.fullName || `${data.profile?.first_name || ''} ${data.profile?.last_name || ''}`.trim();
            if (apiName) {
              console.log("Updating name from API to:", apiName);
              setUserName(apiName);
              // Also update localStorage
              localStorage.setItem('userName', apiName);
            }
          }
        })
        .catch(error => {
          console.error("Failed to fetch profile from API:", error);
        });
      }
    } catch (error) {
      console.error("Failed to fetch user info from storage", error);
      setUserName(authUser?.name || 'Patient');
    }
  }, [authUser]);

  // Listen for profile updates from the EditPatientProfile component
  useEffect(() => {
    // Function to handle profile update event
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Profile updated event received:', event.detail);
      updateUserInfoFromStorage();
    };

    // Add event listener for the custom profileUpdated event
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    // Call once on mount
    updateUserInfoFromStorage();

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [authUser, updateUserInfoFromStorage]);

  // Also refetch when the component is focused (e.g., when navigating back from edit profile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserInfoFromStorage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateUserInfoFromStorage]);

  // Early return if context is not available
  if (!authContext) {
    return <div>Loading context...</div>;
  }

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        // Check if logout exists before calling it
        if (logout) {
          await logout();
          console.log("User logged out, navigating to welcome.");
        }
        // Always navigate to home page, even if logout function doesn't exist
        navigate('/');
      } catch (error) {
        console.error("Failed to logout", error);
        navigate('/');
      }
    }
  };

  const goToEditProfile = () => {
    console.log("Navigate to Edit Profile");
    navigate('/patient/profile/edit');
  };

  const goToPaymentMethods = () => {
    console.log("Navigate to Payment Methods");
    navigate('/patient/profile/payment-methods');
  };

  const menuItems: MenuItemProps[] = [
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      description: 'Update your personal information',
      icon: faUser,
      iconBackgroundClass: 'bg-primary-light',
      iconColorClass: 'text-primary',
      onPress: goToEditProfile,
    },
    {
      id: 'payment-methods',
      title: 'Payment Methods',
      description: 'Manage your saved payment methods',
      icon: faCreditCard,
      iconBackgroundClass: 'bg-purple-light',
      iconColorClass: 'text-purple',
      onPress: goToPaymentMethods,
    },
  ];

  const renderProfileHeader = () => (
    <div className="profile-user-card">
      <div className="profile-user-row">
        <div className="profile-image-container">
            <div className="profile-image-placeholder">
              <FontAwesomeIcon icon={faUser} size="2x" />
            </div>
        </div>
        <div className="profile-info">
          <h3 className="user-name">{userName}</h3>
          <p className="welcome-text">Welcome to Tabeebou.com</p>
        </div>
      </div>
    </div>
  );

  const renderMenuItem = (item: MenuItemProps) => (
    <button
      key={item.id}
      className="menu-item-btn"
      onClick={item.onPress}
    >
      <div className={`menu-icon-wrapper ${item.iconBackgroundClass}`}>
        <FontAwesomeIcon icon={item.icon} className={`menu-icon ${item.iconColorClass}`} />
      </div>
      <div className="menu-text-wrapper">
        <span className="menu-item-title">{item.title}</span>
        <span className="menu-item-description">{item.description}</span>
      </div>
      <div className="menu-arrow-wrapper">
        <FontAwesomeIcon icon={faChevronRight} className="menu-arrow-icon" />
      </div>
    </button>
  );

  return (
    <div className="profile-screen-container">
      <div className="profile-scroll-container">
        <header className="profile-header">
          <div className="profile-header-title-container">
            <h1>My Profile</h1>
            <p>Manage your account and preferences</p>
          </div>
        </header>

        {renderProfileHeader()}

        <section className="menu-section">
          <h2>Account Settings</h2>
          <div className="menu-list-container">
            {menuItems.map(renderMenuItem)}
          </div>
        </section>

        <section className="logout-section">
          <button 
            className="logout-button-main"
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Logout</span>
          </button>
        </section>
      </div>
    </div>
  );
};

export default PatientProfile;