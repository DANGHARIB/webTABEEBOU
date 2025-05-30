import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faCreditCard, 
  faTrash, 
  faStar,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';
import { faApple } from '@fortawesome/free-brands-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { patientAPI } from '../../../services/api';
import './PaymentMethods.css';

// Type for payment methods
type PaymentMethod = {
  _id: string;
  name: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  lastFourDigits?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardType?: string;
  isDefault: boolean;
};

const PaymentMethods: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // State for error message display
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // State to track if we're using mock data
  const [usingMockData, setUsingMockData] = useState<boolean>(false);

  // Mock payment methods for testing when API is not available
  const mockPaymentMethods: PaymentMethod[] = [
    {
      _id: 'mock-1',
      name: 'Personal Visa',
      type: 'card',
      lastFourDigits: '4242',
      expiryMonth: '12',
      expiryYear: '25',
      isDefault: true
    },
    {
      _id: 'mock-2',
      name: 'Business Card',
      type: 'card',
      lastFourDigits: '1234',
      expiryMonth: '10',
      expiryYear: '26',
      isDefault: false
    },
    {
      _id: 'mock-3',
      name: 'My PayPal Account',
      type: 'paypal',
      isDefault: false
    }
  ];

  // Load payment methods when component mounts
  useEffect(() => {
    loadPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setUsingMockData(false);
      
      const data = await patientAPI.getSavedPaymentMethods();
      
      // Make sure we're setting the state with valid data
      if (Array.isArray(data)) {
        setPaymentMethods(data);
      } else {
        setPaymentMethods([]);
      }
    } catch (error: unknown) {
      console.error('Error loading payment methods:', error);
      
      // Show specific error message
      const message = error instanceof Error ? error.message : 'Unable to load your payment methods';
      setErrorMessage(message);
      
      // If we get a 403 Forbidden error, the API endpoint might not be implemented yet
      // Use mock data for demonstration purposes
      if (message.includes('permission') || message.includes('expired')) {
        console.log('Using mock data for payment methods');
        setPaymentMethods(mockPaymentMethods);
        setUsingMockData(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Set a payment method as default
  const handleSetDefault = async (methodId: string) => {
    try {
      await patientAPI.setDefaultPaymentMethod(methodId);
      
      // Update local state
      setPaymentMethods(prevMethods => 
        prevMethods.map(method => ({
          ...method,
          isDefault: method._id === methodId
        }))
      );
      
      alert('Payment method set as default');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      alert('Unable to set this method as default');
    }
  };

  // Delete a payment method
  const handleDelete = async (methodId: string) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      try {
        await patientAPI.deletePaymentMethod(methodId);
        
        // Update local state
        setPaymentMethods(prevMethods => 
          prevMethods.filter(method => method._id !== methodId)
        );
        
        alert('Payment method deleted');
      } catch (error) {
        console.error('Error deleting payment method:', error);
        
        // Show specific error message if available
        if (error instanceof Error) {
          alert(error.message);
        } else {
          alert('Unable to delete this payment method');
        }
      }
    }
  };

  // Add a new payment method
  const goToAddPaymentMethod = () => {
    navigate('/patient/profile/add-payment-method');
  };

  // Get icons based on payment method type
  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return faCreditCard;
      case 'paypal':
        return faPaypal;
      case 'apple_pay':
        return faApple;
      case 'google_pay':
        return faGoogle;
      default:
        return faCreditCard;
    }
  };

  // Get label based on payment method type
  const getPaymentMethodLabel = (type: string) => {
    switch (type) {
      case 'card':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return 'Payment Method';
    }
  };

  return (
    <div className="payment-methods-container">
      <div className="payment-methods-header">
        <button onClick={() => navigate('/patient/profile')} className="back-button">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="header-title">Payment Methods</h1>
      </div>
      
      <div className="payment-methods-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading payment methods...</p>
          </div>
        ) : errorMessage && !usingMockData ? (
          <div className="error-container">
            <p className="error-message">{errorMessage}</p>
            <button 
              className="retry-button"
              onClick={() => loadPaymentMethods()}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="header">
              <h2 className="header-title">Your Payment Methods</h2>
              <p className="header-subtitle">
                Manage your payment options for faster bookings
              </p>
            </div>
            

            
            {paymentMethods.length > 0 ? (
              <div className="payment-methods-list">
                {paymentMethods.map(method => (
                    <div key={method._id} className="payment-method-item">
                      <div className="payment-method-header">
                        <div className="payment-method-icon-container">
                          <FontAwesomeIcon icon={getPaymentMethodIcon(method.type)} />
                        </div>
                        
                        <div className="payment-method-info">
                          <h3 className="payment-method-name">{method.name}</h3>
                          <p className="payment-method-details">
                            {method.type === 'card' 
                              ? `${getPaymentMethodLabel(method.type)} •••• ${method.lastFourDigits || '****'} | Exp: ${method.expiryMonth || 'XX'}/${method.expiryYear || 'XX'}`
                              : getPaymentMethodLabel(method.type)
                            }
                          </p>
                        </div>
                        
                        {method.isDefault && (
                          <div className="default-badge">
                            <span>Default</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="payment-method-actions">
                        {!method.isDefault && (
                          <button 
                            className="action-button"
                            onClick={() => handleSetDefault(method._id)}
                          >
                            <FontAwesomeIcon icon={faStar} />
                            <span>Set as default</span>
                          </button>
                        )}
                        
                        <button 
                          className="action-button delete-button"
                          onClick={() => handleDelete(method._id)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FontAwesomeIcon icon={faCreditCard} size="3x" className="empty-icon" />
                <p className="empty-state-text">
                  You don't have any saved payment methods yet
                </p>
              </div>
            )}
            
            <button 
              className="add-button"
              onClick={goToAddPaymentMethod}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Add Payment Method</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentMethods;
