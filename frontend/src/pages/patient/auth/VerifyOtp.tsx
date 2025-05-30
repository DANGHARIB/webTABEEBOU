import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext, type User } from '../../../contexts/AuthContext'; // Adjusted import
import { jwtDecode } from 'jwt-decode';
import './VerifyOtp.css'; // We'll create this

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);

  if (!authContext) {
    // This should ideally not happen if VerifyOtp is rendered within AuthProvider
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { setAuthenticatedUserManually } = authContext;

  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendError, setResendError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [timer, setTimer] = useState(59);
  const [timerActive, setTimerActive] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError('Email not found. Please restart the registration process.');
      // navigate('/patient/auth/register');
    }
  }, [location.search]);

  useEffect(() => {
    if (inputRefs.current[0] && email) {
      inputRefs.current[0]?.focus();
    }
  }, [email]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            setTimerActive(false);
            clearInterval(interval);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, timerActive]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return; // Allow only single digit or empty
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 4 || !email) {
      setError('Please enter the 4-digit code and ensure email is present.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const verifyResponse = await axios.post(`${API_URL}/auth/verify-otp`, {
        email,
        otp: otpCode,
        role: 'Patient'
      });

      if (verifyResponse.data && verifyResponse.data.token) {
        const token = verifyResponse.data.token;
        localStorage.setItem('token', token); // Store token immediately

        // Update patient profile with additional details
        const patientDetails = JSON.parse(localStorage.getItem('patientAdditionalDetails') || '{}');
        if (email && patientDetails.gender && patientDetails.dateOfBirth) {
          // API call to update patient profile with additional details
          // Ensure your backend has an endpoint like PUT /api/patients/profile
          await axios.put(`${API_URL}/patients/profile`, patientDetails, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }

        // Decode token to get user data for AuthContext
        const decodedUser = jwtDecode<User>(token);

        // Use AuthContext to set user as authenticated
        setAuthenticatedUserManually(token, decodedUser, 'Patient');

        navigate('/patient/auth/login');
      } else {
        setError(verifyResponse.data?.message || 'Verification failed. Token not received.');
      }
    } catch (err) {
      let errorMessage = 'Invalid verification code or an error occurred.';
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = err.response.data?.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setResendError('Email not found.');
      return;
    }
    setIsLoading(true);
    setResendError('');
    setResendSuccess('');
    try {
      await axios.post(`${API_URL}/auth/resend-otp`, { email, role: 'Patient' });
      setResendSuccess('A new OTP has been sent to your email.');
      setTimer(59);
      setTimerActive(true);
      setOtp(['', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      let errorMessage = 'Failed to resend OTP. Please try again.';
      if (axios.isAxiosError(err) && err.response) {
        errorMessage = err.response.data?.message || errorMessage;
      }
      setResendError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email && !error) {
    return <div className="loading-container login-container"><p>Loading...</p></div>;
  }

  return (
    <div className="otp-container login-container">
      <div className="otp-card login-card">
        <h2>Enter Verification Code</h2>
        <p className="subtitle">
          We&apos;ve sent a 4-digit code to {email}. Please enter it below.
        </p>

        {error && <div className="error-message">{error}</div>}
        {resendError && <div className="error-message">{resendError}</div>}
        {resendSuccess && <div className="success-message">{resendSuccess}</div>}

        <form onSubmit={handleSubmit}>
          <div className="otp-input-group">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text" // Changed to text to handle single char better, validation in handleChange
                name={`otp-${index}`}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={1}
                className="otp-input"
                disabled={isLoading}
                autoComplete="off"
              />
            ))}
          </div>
          
          <button 
            type="submit" 
            className="submit-button login-button"
            disabled={isLoading || otp.join('').length !== 4}
          >
            {isLoading ? 'Verifying...' : 'VERIFY CODE'}
          </button>
        </form>

        <div className="timer-resend-section">
          <p className="timer-text">
            Code expires in: {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
          </p>
          <button 
            onClick={handleResendOtp} 
            className="resend-button"
            disabled={timerActive || isLoading}
          >
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
