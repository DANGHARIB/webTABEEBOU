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

  // Function to check account status
  const checkAccountStatus = useCallback(async () => {
    try {
      setLoading(true);
      // Get token
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error("No token found in localStorage");
        setError("No active session found. Please log in again.");
        setLoading(false);
        setTimeout(() => navigate('/doctor/auth/login'), 3000);
        return;
      }
      
      console.log("Checking status with token present:", !!token);
      
      const response = await axios.get('/api/doctors/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("Server response:", response.data);
      
      // Set verification status based on the doctor's verification status
      if (response.data.verified) {
        setVerificationStatus('verified');
      } else if (response.data.status === 'rejected') {
        setVerificationStatus('rejected');
        if (response.data.rejectionReason) {
          setRejectionReason(response.data.rejectionReason);
        }
      } else {
        setVerificationStatus('pending');
      }
      
      setError('');
    } catch (err) {
      console.error('Error checking account status:', err);
      setError("Unable to check your account status. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Check status periodically
  useEffect(() => {
    // Initial check
    checkAccountStatus();
    
    // Set up periodic check
    const intervalId = setInterval(checkAccountStatus, 30000); // Check every 30 seconds
    
    // Clean up interval on component destruction
    return () => clearInterval(intervalId);
  }, [checkAccountStatus]);
  
  // Handle redirect to login when doctor is verified
  const handleLoginPress = () => {
    try {
      localStorage.setItem('userType', 'doctor');
      navigate('/doctor/auth/login');
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };
  
  // Handle redirect to signup when doctor is rejected
  const handleTryAgainPress = () => {
    try {
      // Remove all stored data to start fresh
      localStorage.removeItem('userType');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('tempUserId');
      localStorage.removeItem('doctorProfileCompleted');
      
      // Remove authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      navigate('/doctor/auth/signup');
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  // Display appropriate screen based on verification status
  if (verificationStatus === 'verified') {
    return (
      <div className="review-container">
        <div className="review-content-wrapper">
          <div className="review-content-section">
            <h1 className="review-main-title">Your account has been verified!</h1>
            <p className="review-description">
              Congratulations! Your doctor account has been approved. You can now log in to start using the platform.
            </p>
            <div className="review-button-section">
              <button className="review-action-button" onClick={handleLoginPress}>
                Log In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (verificationStatus === 'rejected') {
    return (
      <div className="review-container">
        <div className="review-content-wrapper">
          <div className="review-content-section">
            <h1 className="review-main-title">Your application has been rejected</h1>
            <p className="review-description">
              We have reviewed your doctor account application and we regret to inform you that it has not been approved.
              {rejectionReason && (
                <span className="review-rejection-reason">
                  <br /><br />Reason: {rejectionReason}
                </span>
              )}
            </p>
            <div className="review-button-section">
              <button className="review-action-button rejected" onClick={handleTryAgainPress}>
                Try with a new account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Default state - Pending
  return (
    <div className="review-container">
      <div className="review-content-wrapper">
        <div className="review-content-section">
          {loading ? (
            <>
              <div className="review-loading-spinner"></div>
              <h1 className="review-main-title">Checking your account status...</h1>
            </>
          ) : error ? (
            <>
              <h1 className="review-main-title">Connection Error</h1>
              <p className="review-description">{error}</p>
              <div className="review-button-section">
                <button className="review-action-button" onClick={checkAccountStatus}>
                  Retry
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="review-main-title">Your account is currently under review.</h1>
              <p className="review-description">
                You will receive an email with a confirmation once the review is complete or, if needed, an email requesting additional information or notifying you of any issues.
              </p>
              <p className="review-thank-you">Thank you for your patience!</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountUnderReviewScreen;