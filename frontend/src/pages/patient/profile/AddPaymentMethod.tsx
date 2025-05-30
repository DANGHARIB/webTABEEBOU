import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCreditCard, faSave, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { faPaypal, faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { patientAPI } from '../../../services/api';
import './AddPaymentMethod.css';

// Available payment method types
const paymentTypes = [
  { id: 'card', name: 'Credit Card', icon: faCreditCard },
  { id: 'paypal', name: 'PayPal', icon: faPaypal },
  { id: 'apple_pay', name: 'Apple Pay', icon: faApple },
  { id: 'google_pay', name: 'Google Pay', icon: faGoogle }
];

const AddPaymentMethod: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('card');
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Common field
  const [name, setName] = useState('');
  
  // For credit cards
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardType, setCardType] = useState('');

  // For PayPal
  const [paypalEmail, setPaypalEmail] = useState('');

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Determine card type based on first digit
  const detectCardType = (cardNumber: string) => {
    const number = cardNumber.replace(/\s+/g, '');
    
    if (/^4/.test(number)) {
      return 'Visa';
    } else if (/^5[1-5]/.test(number)) {
      return 'Mastercard';
    } else if (/^3[47]/.test(number)) {
      return 'American Express';
    } else if (/^(6011|65|64[4-9])/.test(number)) {
      return 'Discover';
    } else {
      return '';
    }
  };

  // Handle card number change
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    setCardType(detectCardType(formatted));
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Reset form fields when payment type changes
  useEffect(() => {
    // Reset card fields when switching from card
    if (selectedType !== 'card') {
      setCardholderName('');
      setCardNumber('');
      setExpiryMonth('');
      setExpiryYear('');
      setCvv('');
      setCardType('');
    }
    
    // Reset PayPal fields when switching from PayPal
    if (selectedType !== 'paypal') {
      setPaypalEmail('');
    }
  }, [selectedType]);

  // Validate form and update the isFormValid state
  useEffect(() => {
    const checkFormValidity = () => {
      if (!name.trim()) {
        return false;
      }

      let numberWithoutSpaces = '';
      let month = 0;
      
      switch (selectedType) {
        case 'card':
          if (!cardholderName.trim()) {
            return false;
          }

          numberWithoutSpaces = cardNumber.replace(/\s+/g, '');
          if (numberWithoutSpaces.length < 13 || numberWithoutSpaces.length > 19) {
            return false;
          }

          if (!expiryMonth || !expiryYear) {
            return false;
          }

          month = parseInt(expiryMonth, 10);
          if (month < 1 || month > 12) {
            return false;
          }

          if (cvv.length < 3) {
            return false;
          }
          break;

        case 'paypal':
          if (!paypalEmail.trim() || !isValidEmail(paypalEmail)) {
            return false;
          }
          break;

        case 'apple_pay':
        case 'google_pay':
          // Only name is required for these methods
          break;

        default:
          return false;
      }

      return true;
    };

    setIsFormValid(checkFormValidity());
  }, [name, cardholderName, cardNumber, expiryMonth, expiryYear, cvv, paypalEmail, selectedType]);

  // Validate form with alerts for submission
  const validateFormWithAlerts = () => {
    if (!name.trim()) {
      alert('Please provide a name for this payment method');
      return false;
    }

    switch (selectedType) {
      case 'card':
        if (!cardholderName.trim()) {
          alert('Please enter the cardholder name');
          return false;
        }

        {
          const numberWithoutSpaces = cardNumber.replace(/\s+/g, '');
          if (numberWithoutSpaces.length < 13 || numberWithoutSpaces.length > 19) {
            alert('Invalid card number');
            return false;
          }
        }

        if (!expiryMonth || !expiryYear) {
          alert('Please enter the expiration date');
          return false;
        }

        {
          const month = parseInt(expiryMonth, 10);
          if (month < 1 || month > 12) {
            alert('Invalid expiration month');
            return false;
          }
        }

        if (cvv.length < 3) {
          alert('Invalid security code');
          return false;
        }
        break;

      case 'paypal':
        if (!paypalEmail.trim()) {
          alert('Please enter your PayPal email address');
          return false;
        }
        if (!isValidEmail(paypalEmail)) {
          alert('Please enter a valid email address');
          return false;
        }
        break;

      case 'apple_pay':
      case 'google_pay':
        // Only name validation is needed
        break;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFormWithAlerts()) return;

    try {
      setLoading(true);
      
      interface PaymentData {
        name: string;
        type: string;
        cardholderName?: string;
        cardNumber?: string;
        expiryMonth?: string;
        expiryYear?: string;
        cvv?: string;
        cardType?: string;
        paypalEmail?: string;
      }
      
      const paymentData: PaymentData = {
        name,
        type: selectedType,
      };

      // Add specific fields based on payment type
      switch (selectedType) {
        case 'card':
          paymentData.cardholderName = cardholderName;
          paymentData.cardNumber = cardNumber.replace(/\s+/g, '');
          paymentData.expiryMonth = expiryMonth;
          paymentData.expiryYear = expiryYear;
          paymentData.cvv = cvv;
          paymentData.cardType = cardType;
          break;

        case 'paypal':
          paymentData.paypalEmail = paypalEmail;
          break;

        case 'apple_pay':
        case 'google_pay':
          // No additional fields needed
          break;
      }

      await patientAPI.addPaymentMethod(paymentData);
      alert('Payment method added successfully');
      navigate('/patient/profile/payment-methods');
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render form fields based on payment type
  const renderFormFields = () => {
    switch (selectedType) {
      case 'card':
        return (
          <>
            <div className="form-group">
              <label htmlFor="cardholderName">Cardholder Name</label>
              <input
                type="text"
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Full name on card"
                autoCapitalize="words"
              />
            </div>
            
            <div className="form-group card-number-container">
              <label htmlFor="cardNumber">Card Number</label>
              <input
                type="text"
                id="cardNumber"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
              {cardType && (
                <span className="card-type-text">{cardType}</span>
              )}
            </div>
            
            <div className="form-row">
              <div className="expiry-container">
                <label>Expiration Date</label>
                <div className="expiry-inputs">
                  <input
                    type="text"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                    placeholder="MM"
                    maxLength={2}
                    className="small-input"
                  />
                  <span className="expiry-divider">/</span>
                  <input
                    type="text"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    placeholder="YY"
                    maxLength={2}
                    className="small-input"
                  />
                </div>
              </div>
              
              <div className="cvv-container">
                <label htmlFor="cvv">CVC</label>
                <input
                  type="password"
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
          </>
        );

      case 'paypal':
        return (
          <div className="form-group">
            <label htmlFor="paypalEmail">PayPal Email Address</label>
            <input
              type="email"
              id="paypalEmail"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="your.email@example.com"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        );

      case 'apple_pay':
        return (
          <div className="external-service-message info-container">
            <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
            <p className="info-text">
              This will use the cards saved in your Apple Wallet
            </p>
          </div>
        );

      case 'google_pay':
        return (
          <div className="external-service-message info-container">
            <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
            <p className="info-text">
              This will use the cards saved in your Google Pay account
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="add-payment-container">
      <div className="add-payment-header">
        <button onClick={() => navigate('/patient/profile/payment-methods')} className="back-button">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="header-title">Add Payment Method</h1>
      </div>
      
      <div className="add-payment-content">
        <div className="payment-type-selector">
          <h2>Select Payment Type</h2>
          <div className="payment-types">
            {paymentTypes.map(type => (
              <button 
                key={type.id}
                className={`type-button ${selectedType === type.id ? 'active' : ''}`}
                onClick={() => setSelectedType(type.id)}
              >
                <FontAwesomeIcon icon={type.icon} />
                <span>{type.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-group">
            <label htmlFor="name">Payment Method Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Personal Card"
              required
            />
          </div>
          
          {renderFormFields()}
          
          <button 
            type="submit" 
            className={`submit-button ${!isFormValid ? 'disabled' : ''}`}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <div className="spinner-small"></div>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                <span>Add Payment Method</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentMethod;
