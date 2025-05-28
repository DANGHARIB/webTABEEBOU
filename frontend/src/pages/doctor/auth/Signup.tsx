import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

const DoctorSignupScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (name, value) => {
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'Doctor'
      });
      
      localStorage.setItem('doctorToken', response.data.token);
      localStorage.setItem('doctorData', JSON.stringify(response.data));
      localStorage.setItem('tempUserId', response.data._id);
      localStorage.setItem('userType', 'doctor');
      navigate('/doctor/auth/details');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="signup-content">
        <h1 className="signup-title">Create Doctor Account</h1>
        <p className="signup-subtitle">
          Join our network of esteemed medical professionals.
        </p>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Dr. Lorem Ipsum"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="doctor.email@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-container">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                autoComplete="new-password"
              />
              <button 
                type="button"
                className="password-toggle" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="password-container">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button 
            type="submit" 
            className={`create-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? <div className="create-spinner"></div> : 'CREATE ACCOUNT'}
          </button>

          <div className="login-link" onClick={() => navigate('../login')}>
            <span>←</span>
            <p>Already have an account? Login</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorSignupScreen; 