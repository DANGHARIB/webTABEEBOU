import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { doctorAPI } from '../../../services/api'; // Added import
import type { Doctor } from '../../../types/api.types'; // Added import
import { faUser, faSignOutAlt, faBell, faChevronRight, faTimes, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './DoctorProfile.css';

// Types for API data
type Notification = {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type?: string;
  data?: Record<string, unknown>;
};




const DoctorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorData, setDoctorData] = useState<Doctor | null>(null); // Changed type to Doctor
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch doctor profile and notifications
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Get doctor profile using doctorAPI
        const profileApiResponse = await doctorAPI.getProfile();
        console.log('[DoctorProfile] Full profileApiResponse:', profileApiResponse); // Added logging
        
        if (profileApiResponse && profileApiResponse.profile && profileApiResponse.user) {
            const mappedDoctorData: Doctor = {
                id: profileApiResponse.profile._id,
                userId: profileApiResponse.user._id,
                firstName: profileApiResponse.profile.first_name,
                lastName: profileApiResponse.profile.last_name,
                specialty: profileApiResponse.profile.specialization, // This is an ID string, may need conversion to name later
                address: profileApiResponse.profile.address || '', // Placeholder if not in profile obj
                phone: profileApiResponse.profile.phone || '',     // Placeholder if not in profile obj
                email: profileApiResponse.user.email,
                bio: profileApiResponse.profile.about,
                profileImage: profileApiResponse.profile.doctor_image,
                approved: profileApiResponse.profile.verified === true,
                // ratings and reviews are optional in Doctor type and not in this response
            };
            setDoctorData(mappedDoctorData);
        } else {
            let errorMsg = 'Failed to process doctor profile data. Structure unexpected.';
            if (!profileApiResponse) {
                errorMsg = 'No response received for doctor profile.';
            } else if (!profileApiResponse.profile) {
                errorMsg = 'Doctor profile details missing in response.';
            } else if (!profileApiResponse.user) {
                errorMsg = 'User details for doctor missing in response.';
            }
            console.error('[DoctorProfile] Error condition details:', { profileApiResponse });
            throw new Error(errorMsg);
        }
        
        // Get notifications - ensure token is still valid and available for this direct call
        const tokenForNotifications = localStorage.getItem('token'); 
        if (!tokenForNotifications) {
          throw new Error('Authentication token not found for notifications');
        }
        const notificationsResponse = await axios.get('/api/notifications', { // This still uses direct axios and relative path
          headers: { Authorization: `Bearer ${tokenForNotifications}` }
        });
        console.log('[DoctorProfile] Full notificationsResponse:', notificationsResponse);

        if (notificationsResponse && notificationsResponse.data && Array.isArray(notificationsResponse.data.data)) {
          setNotifications(notificationsResponse.data.data);
          // Use the unreadCount from the response if available, otherwise calculate it
          setUnreadCount(typeof notificationsResponse.data.unreadCount === 'number' 
            ? notificationsResponse.data.unreadCount 
            : notificationsResponse.data.data.filter((n: Notification) => !n.read).length);
        } else {
          console.warn('[DoctorProfile] Notifications data is not in the expected format or is missing. Expected response.data.data to be an array. Received:', notificationsResponse ? notificationsResponse.data : 'No response data');
          setNotifications([]); // Default to empty array if data is not as expected
          setUnreadCount(0);
        }
      } catch (err) {
        console.error('Error fetching doctor data (raw error object):', err); // Modified logging
        let errorMessage = 'Failed to load profile data. Please try again.';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        // Log the profileApiResponse even in catch if it exists from a previous step, though less likely here
        // console.log('[DoctorProfile] profileApiResponse in catch (if available):', typeof profileApiResponse !== 'undefined' ? profileApiResponse : 'not available');
        setError(errorMessage);
        // For more detailed error, consider logging err.response if using axios directly or if the api wrapper passes it
        // if (axios.isAxiosError(err) && err.response) {
        //   console.error('[DoctorProfile] Axios error response data:', err.response.data);
        //   console.error('[DoctorProfile] Axios error response status:', err.response.status);
        // }

      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctorProfile();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Call the logout function from the auth context
      logout();
      // Show success notification
      addNotification('You have been successfully logged out', 'success');
      // Redirect to home page using window.location for more reliable navigation
      window.location.href = '/';
    }
  };

  const goToEditProfile = () => {
    navigate('/doctor/profile/edit');
  };

  const goToAvailability = () => {
    navigate('/doctor/availability');
  };

  const handleOpenNotificationsModal = () => {
    setNotificationModalVisible(true);
  };

  const handleCloseNotificationsModal = () => {
    setNotificationModalVisible(false);
  };
  
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Call the API to mark all notifications as read
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state - mark all as read
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => ({
          ...notif,
          read: true
        }))
      );
      
      // Update unread count
      setUnreadCount(0);
      
      // Show success notification
      addNotification('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      addNotification('Failed to mark notifications as read', 'error');
    }
  };
  
  const deleteAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Ask for confirmation
      if (!window.confirm('Are you sure you want to delete all notifications?')) {
        return;
      }
      
      // Call the API to delete all notifications
      await axios.delete('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications([]);
      setUnreadCount(0);
      
      // Show success notification
      addNotification('All notifications deleted', 'success');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      addNotification('Failed to delete notifications', 'error');
    }
  };
  
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Call the API to mark notification as read
      await axios.put(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => {
          if (notif._id === notificationId) {
            return { ...notif, read: true };
          }
          return notif;
        })
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      addNotification('Failed to mark notification as read', 'error');
    }
  };
  
  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Call the API to delete the notification
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      const deletedNotification = notifications.find(n => n._id === notificationId);
      setNotifications(prevNotifications => 
        prevNotifications.filter(notif => notif._id !== notificationId)
      );
      
      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Show success notification
      addNotification('Notification deleted', 'success');
    } catch (error) {
      console.error(`Error deleting notification ${notificationId}:`, error);
      addNotification('Failed to delete notification', 'error');
    }
  };

  const menuItems = [
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      description: 'Update your personal information',
      icon: faUser,
      iconBackground: '#7AA7CC',
      onPress: goToEditProfile,
    },
    {
      id: 'availability',
      title: 'Set Availability Slots',
      description: 'Manage your consultation schedule',
      icon: faCalendarAlt,
      iconBackground: '#22C55E',
      onPress: goToAvailability,
    }
  ];

  const renderProfileHeader = () => (
    <div className="profile-container">
      <div className="profile-row">
        <div className="profile-image-container">
          {doctorData?.profileImage ? (
            <img src={doctorData.profileImage} alt="Profile" className="profile-image" />
          ) : (
            <div className="profile-image-placeholder">
              <FontAwesomeIcon icon={faUser} className="profile-icon" />
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h3 className="user-name">{doctorData ? `${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim() || 'Doctor' : 'Doctor'}</h3>
          <p className="welcome-text">Welcome to Tabeebou.com</p>
        </div>
      </div>
    </div>
  );

  const renderMenuItem = (item: {
    id: string;
    title: string;
    description: string;
    icon: typeof faUser;
    iconBackground: string;
    onPress: () => void;
  }) => (
    <button
      key={item.id}
      className="menu-item"
      onClick={item.onPress}
    >
      <div className="menu-item-content">
        <div 
          className="menu-icon-container" 
          style={{ backgroundColor: `${item.iconBackground}15` }}
        >
          <FontAwesomeIcon 
            icon={item.icon} 
            style={{ color: item.iconBackground }} 
            className="menu-icon"
          />
        </div>
        
        <div className="menu-text-container">
          <h4 className="menu-item-title">{item.title}</h4>
          <p className="menu-item-description">{item.description}</p>
        </div>
        
        <div className="menu-arrow-container">
          <FontAwesomeIcon 
            icon={faChevronRight} 
            className="menu-arrow"
          />
        </div>
      </div>
    </button>
  );

  if (loading) {
    return <div className="loading-state">Loading profile data...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="doctor-profile">
      <div className="profile-header">
        <div className="header-title-container">
          <h1 className="header-title">My Profile</h1>
          <p className="header-subtitle">Manage your account and preferences</p>
        </div>
        
        <button 
          className="notification-button" 
          onClick={handleOpenNotificationsModal}
        >
          <FontAwesomeIcon icon={faBell} className="notification-icon" />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
      </div>

      {renderProfileHeader()}

      <div className="menu-container">
        <h2 className="section-title">Account Settings</h2>
        
        <div className="menu-list">
          {menuItems.map(renderMenuItem)}
        </div>
      </div>

      <div className="logout-container">
        <button 
          className="logout-button" 
          onClick={handleLogout}
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
          <span className="logout-button-text">Logout</span>
        </button>
      </div>

      {notificationModalVisible && (
        <div className="notification-modal-overlay">
          <div className="notification-modal">
            <div className="notification-modal-header">
              <h3>Notifications</h3>
              <button 
                className="close-button" 
                onClick={handleCloseNotificationsModal}
                aria-label="Close notifications"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <FontAwesomeIcon icon={faBell} size="2x" opacity={0.3} />
                  </div>
                  <p className="empty-text">No notifications available</p>
                  <p className="empty-subtext">We'll notify you when there's activity on your account</p>
                </div>
              ) : (
                <>
                  <div className="notification-actions">
                    <div className="action-buttons">
                      <button 
                        className="mark-all-read"
                        onClick={markAllAsRead}
                        disabled={notifications.every(n => n.read)}
                      >
                        Mark all as read
                      </button>
                      <button 
                        className="delete-all"
                        onClick={deleteAllNotifications}
                        disabled={notifications.length === 0}
                      >
                        Delete all
                      </button>
                    </div>
                  </div>
                  {notifications.map((notification) => {
                    const date = new Date(notification.createdAt);
                    const today = new Date();
                    const isToday = date.toDateString() === today.toDateString();
                    const isYesterday = new Date(date.setDate(date.getDate() + 1)).toDateString() === today.toDateString();
                    
                    let dateDisplay;
                    if (isToday) {
                      dateDisplay = `Today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    } else if (isYesterday) {
                      dateDisplay = `Yesterday at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    } else {
                      dateDisplay = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    }
                    
                    return (
                      <div 
                        key={notification._id} 
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      >
                        {!notification.read && <div className="unread-indicator" />}
                        <div className="notification-content">
                          <div className="notification-header">
                            <h4 className="notification-title">{notification.title}</h4>
                            <span className="notification-date">{dateDisplay}</span>
                          </div>
                          <p className="notification-message">{notification.message}</p>
                          <div className="notification-actions">
                            <div className="notification-action-buttons">
                              {!notification.read && (
                                <button 
                                  className="mark-read-btn"
                                  onClick={() => markAsRead(notification._id)}
                                >
                                  Mark as read
                                </button>
                              )}
                              <button 
                                className="delete-btn"
                                onClick={() => deleteNotification(notification._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;
