import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCreditCard, 
  faCalendar, 
  faCheckCircle, 
  faTimesCircle, 
  faKey, 
  faUndo, 
  faInfoCircle, 
  faSpinner, 
  faExclamationCircle, 
  faWallet,

} from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';
import './DoctorPayments.css';
import { doctorAPI } from '../../../services/api';
import type { Payment, Patient, Appointment } from '../../../types/api.types';

// Define allowed payment statuses
const paymentStatuses = ['pending', 'completed', 'refunded', 'failed'] as const;
type PaymentStatusType = typeof paymentStatuses[number];

// Type guard to check if a string is a valid PaymentStatusType
const isValidPaymentStatus = (status: string | undefined): status is PaymentStatusType => {
  if (typeof status !== 'string') {
    return false; // undefined or non-string cannot be a valid status
  }
  return (paymentStatuses as ReadonlyArray<string>).includes(status);
};

// Raw data interfaces to represent the API response more accurately, including snake_case
interface ApiPatientData {
  _id?: string;
  id?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  user?: { 
    _id?: string;
    email?: string;
    fullName?: string;
  };
  userId?: string;
}

interface ApiAppointmentData {
  _id?: string;
  id?: string;
  date?: string; 
  time?: string;
  availability?: { 
    _id?: string;
    date?: string; 
  };
  patient?: ApiPatientData; 
  doctorId?: string; // Added based on DoctorPaymentDetails
  status?: PaymentStatusType | string; // Allow string for flexibility from API, then validate
  [key: string]: any; 
}

interface ApiPaymentData {
  _id: string; 
  appointment?: ApiAppointmentData;
  patient?: ApiPatientData; 
  amount?: number;
  paymentMethod?: string;
  status?: PaymentStatusType | string; // Allow string for flexibility from API, then validate
  createdAt?: string;
  updatedAt?: string; 
  paymentDate?: string;
  transactionId?: string;
  [key: string]: any; 
}

// Helper to transform a raw patient object
const transformRawPatientObject = (rawPatient?: ApiPatientData): Patient | undefined => {
  if (!rawPatient || typeof rawPatient !== 'object') return undefined;
  
  const patientId = rawPatient._id || rawPatient.id;
  const userId = rawPatient.user?._id || rawPatient.userId;

  if (!patientId && !userId) { 
    // Potentially invalid patient if both are missing and type is strict
  }

  const patient: Patient = {
    id: patientId ?? '', 
    userId: userId ?? '', 
    firstName: (rawPatient.firstName || rawPatient.first_name) ?? '',
    lastName: (rawPatient.lastName || rawPatient.last_name) ?? '',
    email: (rawPatient.email || rawPatient.user?.email) ?? '',
    phone: rawPatient.phone ?? '',
  };

  if (!patient.id && !patient.userId && !patient.firstName && !patient.lastName && !patient.email) {
    // May return undefined if insufficient data
  }
  return patient;
};

// Utility function to transform raw API payment object to Payment object
const transformApiPaymentToPayment = (rawPayment: ApiPaymentData): Payment => {
  const { _id, appointment: rawAppointment, patient: rawTopLevelPatientData, updatedAt: rawUpdatedAt, ...rest } = rawPayment;

  let transformedAppointment: Appointment | undefined = undefined;
  if (rawAppointment && typeof rawAppointment === 'object') {
    const { availability, patient: rawNestedPatientInAppointment, ...appointmentRest } = rawAppointment;
    
    transformedAppointment = {
      ...appointmentRest,
      id: (rawAppointment._id || rawAppointment.id) ?? '',
      date: (rawAppointment.date || availability?.date) ?? '',
      time: rawAppointment.time ?? '',
      patient: transformRawPatientObject(rawNestedPatientInAppointment),
      doctorId: rawAppointment.doctorId ?? '', 
      status: isValidPaymentStatus(rawAppointment.status as string | undefined) ? rawAppointment.status as PaymentStatusType : 'pending',     
    } as Appointment; 
  }

  const transformedPayment: Payment = {
    id: _id,
    amount: rest.amount ?? 0, 
    paymentMethod: rest.paymentMethod ?? '', 
    status: isValidPaymentStatus(rest.status as string | undefined) ? rest.status as PaymentStatusType : 'pending', 
    createdAt: rest.createdAt ?? new Date().toISOString(), 
    paymentDate: rest.paymentDate ?? '', 
    transactionId: rest.transactionId ?? '', 
    appointmentId: rawAppointment?._id || rawAppointment?.id || '', 
    updatedAt: rawUpdatedAt ?? (rest.createdAt || new Date().toISOString()), 
    appointment: transformedAppointment,
    patient: transformRawPatientObject(rawTopLevelPatientData),
  };
  return transformedPayment;
};



const DoctorPayments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
      try {
        console.log('[DoctorPayments] Attempting to fetch payments...');
        const result = await doctorAPI.getDoctorPayments();
        console.log('[DoctorPayments] Raw result from doctorAPI.getDoctorPayments():', result);

        if (result && typeof result.success === 'boolean' && result.success && result.data) {
          // Scenario 1: Standard successful ApiResponse
          const apiData = result.data as unknown as ApiPaymentData[];
          const transformedPayments = apiData.map(transformApiPaymentToPayment);
          setPayments(transformedPayments);
          setError(null); // Clear any previous error
        } else if (Array.isArray(result)) {
          // Scenario 2: The result itself is the array of payments (e.g., from a 304 cache)
          const apiData = result as ApiPaymentData[];
          const transformedPayments = apiData.map(transformApiPaymentToPayment);
          setPayments(transformedPayments);
          setError(null); // Clear any previous error
        } else if (result === undefined || result === null) {
          // Scenario 3: Result is undefined/null (likely a 304 where axiosResponse.data is undefined)
          // Data hasn't changed, no new data to set, and not an error.
          console.log('[DoctorPayments] Scenario 3: Received undefined/null result (likely 304). Retaining current payments.');
          setError(null);
          setLoading(false); // Explicitly set loading to false here as well
          return; // Exit early, 304 is not an error and data is cached
        } else {
          // Scenario 4: ApiResponse indicates failure (e.g., success:false), or other unexpected non-array, non-undefined structures
          let errorMessage = 'Failed to load payment data.';
          if (typeof result.message === 'string') {
            errorMessage = result.message;
          } else if (typeof result.success === 'boolean' && !result.success) {
            // Explicit API failure response without a message property
            errorMessage = result.message || 'API request returned an error.';
          }
          console.error('Error or unexpected data format fetching payments:', result);
          setError(errorMessage);
          // Consider if payments should be cleared here, e.g., setPayments([]);
        }
      } catch (err) {
        console.error('Error loading payments:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          if (axiosError.response?.data?.message) {
             setError(axiosError.response.data.message);
          } else {
             setError(errorMessage);
          }
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }, []); // No dependencies needed as setters are stable and transform is external

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Effect to clear error when loading starts
  useEffect(() => {
    if (loading) {
      setError(null);
    }
  }, [loading]);

  // Filter payments
  const getFilteredPayments = () => {
    if (!activeFilter) return payments;
    
    return payments.filter(payment => {
      if (activeFilter === 'refunds') {
        return payment.status === 'refunded';
      }
      if (activeFilter === 'payments') {
        return payment.status === 'completed';
      }
      if (activeFilter === 'monthly') {
        // Filter by current month
        const paymentDate = new Date(payment.paymentDate || payment.createdAt);
        const currentDate = new Date();
        return paymentDate.getMonth() === currentDate.getMonth() && 
               paymentDate.getFullYear() === currentDate.getFullYear();
      }
      return true;
    });
  };

  // Calculate monthly summary
  const getMonthlyTotal = () => {
    const currentDate = new Date();
    let totalEarned = 0;
    let totalRefunded = 0;
    let totalPenalties = 0;
    let paymentCount = 0;
    let refundCount = 0;

    payments.forEach(payment => {
      const paymentDate = new Date(payment.paymentDate || payment.createdAt);
      if (paymentDate.getMonth() === currentDate.getMonth() && 
          paymentDate.getFullYear() === currentDate.getFullYear()) {
        
        // If this is a payment that has a refundDetails (original payment refunded)
        if (payment.refundDetails) {
          // The original amount is counted in earnings
          totalEarned += payment.amount;
          paymentCount++;
          
          // The refund amount is deducted from total earnings
          const refundAmount = Math.abs(payment.refundDetails.amount);
          totalRefunded += refundAmount;
          
          // Calculate penalty (difference between original amount and refund)
          // For the doctor, this is a revenue retained
          const penaltyAmount = payment.amount - refundAmount;
          totalPenalties += penaltyAmount;
          
          refundCount++;
        }
        // If this is a normal payment
        else if (payment.status === 'completed') {
          totalEarned += payment.amount;
          paymentCount++;
        }
      }
    });

    // Net amount is calculated as earnings minus refunds
    const netAmount = totalEarned - totalRefunded;

    return {
      totalEarned,
      totalRefunded,
      totalPenalties,
      netAmount,
      paymentCount,
      refundCount,
      monthName: format(currentDate, 'MMMM yyyy', { locale: enUS })
    };
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy', { locale: enUS });
    } catch (e) {
      console.warn('Error formatting date:', e);
      return dateString;
    }
  };

  // Get patient's full name
  const getPatientName = (patient?: { firstName?: string; lastName?: string }) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient Name N/A';
  };

  // Render payment method
  const renderPaymentMethod = (payment: Payment) => {
    const icon = payment.paymentMethod === 'paypal' ? faPaypal : faCreditCard;
    let label = 'Card';
    let color = '#007bff';

    switch (payment.paymentMethod) {
      case 'paypal':
        label = 'PayPal';
        color = '#0070BA';
        break;
      case 'apple_pay':
        label = 'Apple Pay';
        color = '#000000';
        break;
      case 'google_pay':
        label = 'Google Pay';
        color = '#4285F4';
        break;
    }

    return (
      <div className="method-container" style={{ color }}>
        <FontAwesomeIcon icon={icon} className="method-icon" />
        <span className="method-text">{label}</span>
      </div>
    );
  };

  // Render payment status
  const renderPaymentStatus = (status: Payment['status']) => {
    let color = '#5586CC'; // Default to completed color
    let icon = faCheckCircle; // Default to completed icon
    let label = 'Completed';

    switch (status) {
      case 'pending':
        color = '#FFA500';
        icon = faInfoCircle;
        label = 'Pending';
        break;
      case 'refunded':
        color = '#4CAF50';
        icon = faUndo;
        label = 'Refunded';
        break;
      case 'failed':
        color = '#DC3545';
        icon = faTimesCircle;
        label = 'Failed';
        break;
      case 'completed': // Explicitly handle completed for clarity
        color = '#5586CC';
        icon = faCheckCircle;
        label = 'Completed';
        break;
    }

    return (
      <div className="status-badge" style={{ backgroundColor: color }}>
        <FontAwesomeIcon icon={icon} className="status-icon" />
        <span className="status-text">{label}</span>
      </div>
    );
  };

  // Render filters
  const renderFilters = () => {
    return (
      <div className="filters-container">
        <button 
          className={`filter-button ${activeFilter === null ? 'active-filter' : ''}`}
          onClick={() => setActiveFilter(null)}
        >
          <span className="filter-text">All</span>
          {activeFilter === null && <div className="filter-active-indicator"></div>}
        </button>
        
        <button 
          className={`filter-button ${activeFilter === 'payments' ? 'active-filter' : ''}`}
          onClick={() => setActiveFilter('payments')}
        >
          <span className="filter-text">Payments</span>
          {activeFilter === 'payments' && <div className="filter-active-indicator"></div>}
        </button>
        
        <button 
          className={`filter-button ${activeFilter === 'refunds' ? 'active-filter' : ''}`}
          onClick={() => setActiveFilter('refunds')}
        >
          <span className="filter-text">Refunds</span>
          {activeFilter === 'refunds' && <div className="filter-active-indicator"></div>}
        </button>

        <button 
          className={`filter-button ${activeFilter === 'monthly' ? 'active-filter' : ''}`}
          onClick={() => setActiveFilter('monthly')}
        >
          <span className="filter-text">Monthly</span>
          {activeFilter === 'monthly' && <div className="filter-active-indicator"></div>}
        </button>
      </div>
    );
  };

  // Render monthly summary
  const renderMonthlySummary = () => {
    const monthlyData = getMonthlyTotal();
    
    return (
      <div className="monthly-summary-container">
        <div className="monthly-header">
          <FontAwesomeIcon icon={faCalendar} className="monthly-icon" />
          <h2 className="monthly-title">{monthlyData.monthName}</h2>
        </div>
        
        {monthlyData.paymentCount === 0 && monthlyData.refundCount === 0 ? (
          <div className="summary-card empty-monthly-card">
            <FontAwesomeIcon icon={faWallet} className="empty-monthly-icon" />
            <p className="empty-monthly-text">No transactions this month</p>
          </div>
        ) : (
          <div className="summary-card">
            <div className="summary-row">
              <div className="summary-item">
                <span className="summary-label">Total Earned</span>
                <span className="summary-amount">{monthlyData.totalEarned.toFixed(2)} €</span>
                <span className="summary-count">{monthlyData.paymentCount} payments</span>
              </div>
            </div>
            
            {monthlyData.totalRefunded > 0 && (
              <>
                <div className="summary-row">
                  <div className="summary-item">
                    <span className="summary-label">Total Refunded</span>
                    <span className="refund-summary-amount">- {monthlyData.totalRefunded.toFixed(2)} €</span>
                    <span className="summary-count">{monthlyData.refundCount} refunds</span>
                  </div>
                </div>
                
                <div className="summary-row">
                  <div className="summary-item">
                    <span className="summary-label">Penalties Retained</span>
                    <span className="penalty-summary-amount">{monthlyData.totalPenalties.toFixed(2)} €</span>
                    {/* Optional: <span className="summary-count">{monthlyData.refundCount} cancellations</span> */}
                  </div>
                </div>
              </>
            )}
            
            <div className="summary-row total-row">
              <div className="summary-item">
                <span className="total-label">Net Income This Month</span>
                <span className="total-amount">{monthlyData.netAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  // Render a standard payment
  function renderPayment(payment: Payment, index: number): React.ReactElement {
    const paymentDetailUrl = `/doctor/payments/${payment.id}`;
    return (
      <Link to={paymentDetailUrl} key={payment.id} className="payment-card-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginTop: index > 0 ? '1rem' : '0' }}>
        <div className={`payment-card ${payment.status}`}>
          <div className="payment-card-inner">
            <div className="payment-header">
              <h3 className="payment-patient">
                {getPatientName(typeof payment.patient === 'object' ? payment.patient : payment.appointment?.patient)}
              </h3>
              {renderPaymentStatus(payment.status)}
            </div>

            <div className="payment-details">
              <div className="date-container">
                <FontAwesomeIcon icon={faCalendar} className="date-icon" />
                <span className="payment-date">
                  {formatDate(payment.appointment?.date || payment.paymentDate || payment.createdAt)}
                </span>
              </div>
              {renderPaymentMethod(payment)}
            </div>

            <div className="payment-footer">
              <div className="transaction-id-container">
                <FontAwesomeIcon icon={faKey} className="transaction-id-icon" />
                <span className="transaction-id">
                  Tx: {payment.transactionId ? payment.transactionId.substring(0, 8) : 'N/A'}...
                </span>
              </div>
              <span className={`payment-amount ${payment.status === 'refunded' ? 'refund-amount' : ''}`}>
                {payment.status === 'refunded' ? '- ' : ''}{payment.displayAmount || payment.amount} €
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // Render combined refund payment (shows original, penalty, and refunded amount)
  function renderCombinedRefundPayment(payment: Payment, index: number): React.ReactElement {
    // This function assumes 'payment' is the original payment that was refunded
    // and it has 'refundDetails' populated.
    const paymentDetailUrl = `/doctor/payments/${payment.id}`; // Link to the original payment's details

    const originalAmount = payment.amount;
    let refundAmount = 0;
    let penaltyAmount = 0;

    if (payment.refundDetails) {
      refundAmount = Math.abs(payment.refundDetails.amount);
      penaltyAmount = originalAmount - refundAmount;
    } else {
      // Fallback if refundDetails is not populated - this might indicate an issue with data transformation or API response
      // For display purposes, we might estimate or show placeholders
      console.warn(`Refunded payment ID ${payment.id} is missing refundDetails. Amounts may be estimated.`);
      // A common scenario is a full refund if not specified, or a pre-defined penalty
      // For now, let's assume penalty is 0 if details are missing, meaning full effective refund for calculation display
      // This part should align with business logic for handling such cases.
      refundAmount = originalAmount; // Or some portion
      penaltyAmount = 0; // Or some portion
    }

    return (
      <Link to={paymentDetailUrl} key={payment.id} className="payment-card-link refund-special-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginTop: index > 0 ? '1rem' : '0' }}>
        <div className={`payment-card refund-card ${payment.status}`}> {/* Ensure refund-card class for specific styling */}
          <div className="payment-card-inner">
            <div className="refund-header">
              <div className="refund-header-left">
                <h3 className="payment-patient">
                  {getPatientName(typeof payment.patient === 'object' ? payment.patient : payment.appointment?.patient)}
                </h3>
                <span className="refund-tag">REFUND PROCESSED</span>
              </div>
              {renderPaymentStatus('refunded')} {/* Explicitly show 'refunded' status icon/text */}
            </div>

            <div className="payment-details">
              <div className="date-container">
                <FontAwesomeIcon icon={faCalendar} className="date-icon" />
                <span className="payment-date">
                  {formatDate(payment.appointment?.date || payment.paymentDate || payment.createdAt)}
                </span>
              </div>
              {renderPaymentMethod(payment) /* Show original payment method */}
            </div>

            <div className="refund-info-breakdown">
              <div className="refund-info-item original-amount">
                <span>Original Payment:</span>
                <span>{originalAmount.toFixed(2)} €</span>
              </div>
              <div className="refund-info-item amount-refunded">
                <span>Amount Refunded to Patient:</span>
                <span className="negative-amount">- {refundAmount.toFixed(2)} €</span>
              </div>
              <div className="refund-info-item penalty-retained">
                <span>Service Fee Retained:</span>
                <span className="positive-amount">+ {penaltyAmount.toFixed(2)} €</span>
              </div>
            </div>

            <div className="payment-footer">
              <div className="transaction-id-container">
                <FontAwesomeIcon icon={faKey} className="transaction-id-icon" />
                <span className="transaction-id">
                  Original Tx: {payment.transactionId ? payment.transactionId.substring(0, 8) : 'N/A'}...
                </span>
              </div>
              {/* Net effect on doctor's balance for this transaction */}
              <span className="payment-amount net-amount-retained">
                Net Retained: {penaltyAmount.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // Render payment list
  const renderPayments = () => {
    console.log('[DoctorPayments] renderPayments called. Current error state:', error, 'Current loading state:', loading);
    if (loading) {
      return (
        <div className="loader-container">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="loader-icon" />
          <p className="loader-text">Loading your transactions...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <FontAwesomeIcon icon={faExclamationCircle} className="error-icon" />
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={fetchPayments}>Retry</button>
        </div>
      );
    }

    // Show monthly summary if monthly filter is active
    if (activeFilter === 'monthly') {
      return renderMonthlySummary();
    }

    const filteredPayments = getFilteredPayments();
    
    if (!filteredPayments.length) {
      return (
        <div className="empty-container">
          <div className="empty-icon-container">
            <FontAwesomeIcon icon={faWallet} className="empty-icon" />
          </div>
          <p className="empty-text">
            {activeFilter === 'refunds' 
              ? 'No refunds found' 
              : 'No payments received yet'}
          </p>
        </div>
      );
    }

    return filteredPayments.map((payment, index) => {
      if (payment.status === 'refunded') {
        return renderCombinedRefundPayment(payment, index);
      } else {
        return renderPayment(payment, index);
      }
    });
  };

  // Main component render
  return (
    <div className="doctor-payments">
      <div className="payments-header">
        <h1 className="payments-title">Finances</h1>
        <p className="payments-subtitle">Your earning history</p>
      </div>
      
      {renderFilters()}
      
      <div className="payments-container">
        {renderPayments()}
      </div>
    </div>
  );
};

export default DoctorPayments;
