import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPerson,
  faCalendarDays,
  faStethoscope, // Using stethoscope for service type
  faCreditCard, // Default card icon
  faKey,
  faClock,
  faExclamationCircle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { faPaypal, faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';

import { doctorAPI } from '../../../services/api';
import { type Payment, type Patient, type Appointment } from '../../../types/api.types';
import './DoctorPaymentDetails.css';

// Define allowed payment statuses
const paymentStatuses = ['pending', 'completed', 'refunded', 'failed'] as const;
type PaymentStatusType = typeof paymentStatuses[number];

// Type guard to check if a string is a valid PaymentStatusType
const isValidPaymentStatus = (status: string | undefined): status is PaymentStatusType => {
  if (typeof status !== 'string') {
    return false; // undefined or non-string cannot be a valid status
  }
  // Cast paymentStatuses to string[] for includes, or check one by one
  return (paymentStatuses as ReadonlyArray<string>).includes(status);
};

// Raw data interfaces to represent the API response more accurately, including snake_case
interface ApiPatientData {
  _id?: string;
  id?: string; // Sometimes API might send 'id'
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  user?: { // Nested user object as observed
    _id?: string;
    email?: string;
    fullName?: string;
  };
  userId?: string; // In case it's directly available
}

interface ApiAppointmentData {
  _id?: string;
  id?: string;
  date?: string; // Direct date on appointment
  time?: string;
  availability?: { // Nested availability object
    _id?: string;
    date?: string; // Date within availability
  };
  patient?: ApiPatientData; // Nested raw patient data
  // Include other fields from Appointment type if they can appear in raw form
  [key: string]: any; // Allow other properties not strictly defined
}

interface ApiPaymentData {
  _id: string; // Assuming _id is always present
  appointment?: ApiAppointmentData;
  patient?: ApiPatientData; // Top-level patient data
  amount?: number;
  paymentMethod?: string;
  status?: PaymentStatusType; // Use the defined literal type, make it optional
  createdAt?: string;
  updatedAt?: string; // Added to match usage in transformApiPaymentToPayment
  paymentDate?: string;
  transactionId?: string;
  // Include other fields from Payment type if they can appear in raw form
  [key: string]: any; // Allow other properties not strictly defined
}

// The existing RawApiPayment might be intended for a slightly less raw state or specific use cases.
// For clarity, we use ApiPaymentData for the direct API response.
interface RawApiPayment extends Omit<Payment, 'id'> {
  _id: string;
}

// Helper to transform a raw patient object
const transformRawPatientObject = (rawPatient?: ApiPatientData): Patient | undefined => {
  if (!rawPatient || typeof rawPatient !== 'object') return undefined;
  
  const patientId = rawPatient._id || rawPatient.id;
  const userId = rawPatient.user?._id || rawPatient.userId;

  // If critical IDs are missing and Patient type requires them as non-empty strings, 
  // this might be an invalid patient. For now, defaulting to empty string to satisfy type.
  // A more robust solution might return undefined or throw an error.
  if (!patientId && !userId) { 
    // If both are missing, and your Patient type needs at least one, consider this invalid.
    // For now, we'll proceed but this might lead to issues if Patient type is strict.
  }

  const patient: Patient = {
    id: patientId ?? '', // Default to empty string if undefined
    userId: userId ?? '', // Default to empty string if undefined
    firstName: (rawPatient.firstName || rawPatient.first_name) ?? '',
    lastName: (rawPatient.lastName || rawPatient.last_name) ?? '',
    email: (rawPatient.email || rawPatient.user?.email) ?? '',
    phone: rawPatient.phone ?? '',
    // Ensure all other fields required by your Patient type are mapped here.
  };

  // Basic validation: if no identifying info, maybe return undefined
  if (!patient.id && !patient.userId && !patient.firstName && !patient.lastName && !patient.email) {
    // console.warn('[transformRawPatientObject] Insufficient patient data to form a valid Patient object:', rawPatient);
    // return undefined; // Depending on how strict your Patient type is and usage.
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
      // Assuming Appointment.status also uses PaymentStatusType or a similar literal union
      status: isValidPaymentStatus(rawAppointment.status) ? rawAppointment.status : 'pending',     
    } as Appointment; 
  }

  const transformedPayment: Payment = {
    id: _id,
    amount: rest.amount ?? 0, 
    paymentMethod: rest.paymentMethod ?? '', 
    status: isValidPaymentStatus(rest.status) ? rest.status : 'pending', // Use type guard and default
    createdAt: rest.createdAt ?? new Date().toISOString(), 
    paymentDate: rest.paymentDate ?? '', 
    transactionId: rest.transactionId ?? '', 
    appointmentId: rawAppointment?._id || rawAppointment?.id || '', 
    updatedAt: rawUpdatedAt ?? (rest.createdAt || new Date().toISOString()), 
    appointment: transformedAppointment,
    patient: transformRawPatientObject(rawTopLevelPatientData),
    // Explicitly list out other properties from 'rest' if they are part of Payment type
    // and need specific handling or are not covered by the defaults above.
  };
  return transformedPayment;
};

const DoctorPaymentDetails: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentDetails = useCallback(async () => {
    if (!paymentId) {
      setError('Payment ID is missing.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log(`[DoctorPaymentDetails] Fetching details for paymentId: ${paymentId}`);
      const response = await doctorAPI.getDoctorPayments();
      console.log('[DoctorPaymentDetails] API Response (raw):', JSON.parse(JSON.stringify(response)));

      // Check if response is an array (direct data) or an ApiResponse object
      if (Array.isArray(response)) {
        console.log('[DoctorPaymentDetails] API returned an array directly. Assuming this is the payment data.');
        const rawPayments = response as unknown as RawApiPayment[]; // Cast directly
        console.log('[DoctorPaymentDetails] Direct rawPayments:', JSON.parse(JSON.stringify(rawPayments)));
        const foundRawPayment = rawPayments.find(p => p._id === paymentId);
        console.log(`[DoctorPaymentDetails] Attempting to find paymentId '${paymentId}' in direct rawPayments.`);
        
        if (foundRawPayment) {
          console.log('[DoctorPaymentDetails] Payment found in direct array:', JSON.parse(JSON.stringify(foundRawPayment)));
          setPayment(transformApiPaymentToPayment(foundRawPayment));
        } else {
          console.log('[DoctorPaymentDetails] Payment NOT found in the direct array.');
          setError('Payment not found.');
        }
      } else if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
        // Standard ApiResponse path (as originally expected)
        console.log('[DoctorPaymentDetails] API returned ApiResponse object.');
        if (response.success && response.data) {
          console.log('[DoctorPaymentDetails] ApiResponse successful and data present.');
          console.log('[DoctorPaymentDetails] response.data from ApiResponse:', JSON.parse(JSON.stringify(response.data)));
          const rawPayments = response.data as unknown as RawApiPayment[];
          const foundRawPayment = rawPayments.find(p => p._id === paymentId);
          console.log(`[DoctorPaymentDetails] Attempting to find paymentId '${paymentId}' in ApiResponse.data.`);
          
          if (foundRawPayment) {
            console.log('[DoctorPaymentDetails] Payment found in ApiResponse.data:', JSON.parse(JSON.stringify(foundRawPayment)));
            setPayment(transformApiPaymentToPayment(foundRawPayment));
          } else {
            console.log('[DoctorPaymentDetails] Payment NOT found in ApiResponse.data.');
            setError('Payment not found.');
          }
        } else {
          console.log(`[DoctorPaymentDetails] ApiResponse indicates failure or no data. response.success: ${response.success}, response.data: ${JSON.stringify(response.data)}, response.message: ${response.message}`);
          setError((response as { message?: string }).message || 'Failed to load payment details from ApiResponse.');
        }
      } else {
        console.log('[DoctorPaymentDetails] Unexpected API response format:', JSON.parse(JSON.stringify(response)));
        setError('Unexpected API response format.');
      }
    } catch (err: unknown) {
      console.error('[DoctorPaymentDetails] CATCH BLOCK - Error loading payment details:', err);
      let message = 'An unexpected error occurred.';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPaymentDetails();
  }, [fetchPaymentDetails]);

  const formatDateStandard = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'MMMM dd, yyyy • h:mm a', { locale: enUS });
    } catch (e: unknown) {
      console.error('Error formatting date:', dateString, e);
      return 'Invalid Date';
    }
  };

  const combineDateTime = (dateStr?: string, timeStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    if (!timeStr) return dateStr; // Return just date if no time
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const cleanTime = timeStr.includes('Z') ? timeStr.split('Z')[0] : timeStr.split('.')[0]; // Simplified
      return `${cleanDate}T${cleanTime}`;
    } catch (e) {
      console.error('Error combining date and time:', e);
      return dateStr;
    }
  };

  const getPatientName = (paymentData: Payment | null): string => {
    if (!paymentData) return 'Unknown Patient';

    let patientDetail: Patient | undefined = undefined;

    // Check appointment.patient first, if it's a usable object
    if (paymentData.appointment?.patient && 
        typeof paymentData.appointment.patient === 'object' && 
        (paymentData.appointment.patient.firstName || paymentData.appointment.patient.lastName)) {
      patientDetail = paymentData.appointment.patient;
    } 
    // Else, check payment.patient if it's a usable object
    else if (paymentData.patient && 
             typeof paymentData.patient === 'object' && 
             (paymentData.patient.firstName || paymentData.patient.lastName)) {
      patientDetail = paymentData.patient;
    }

    if (patientDetail) {
      return `${patientDetail.firstName || ''} ${patientDetail.lastName || ''}`.trim() || 'N/A (Incomplete Data)';
    }
    
    // If no usable patient object was found (e.g., only IDs or empty objects)
    return 'N/A (Data Missing)';
  };

  const getPaymentMethodInfo = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'card':
        return { icon: faCreditCard, label: 'Credit Card' };
      case 'paypal':
        return { icon: faPaypal, label: 'PayPal' };
      case 'apple_pay':
        return { icon: faApple, label: 'Apple Pay' };
      case 'google_pay':
        return { icon: faGoogle, label: 'Google Pay' };
      default:
        return { icon: faCreditCard, label: method || 'Unknown' };
    }
  };

  const getStatusInfo = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { className: 'status-pending', label: 'Pending' };
      case 'completed':
        return { className: 'status-completed', label: 'Completed' };
      case 'refunded':
        return { className: 'status-refunded', label: 'Refunded' };
      case 'failed':
        return { className: 'status-failed', label: 'Failed' };
      default:
        return { className: 'status-unknown', label: status || 'Unknown' };
    }
  };

  if (loading) {
    return (
      <div className="payment-details-loading">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
        <p>Loading payment details...</p>
      </div>
    );
  }

  console.log('[DoctorPaymentDetails] Final payment object for rendering:', JSON.parse(JSON.stringify(payment)));

  if (error || !payment) {
    return (
      <div className="payment-details-error">
        <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
        <p>{error || 'Payment not found.'}</p>
        <button onClick={() => navigate(-1)} className="details-back-button">
          <FontAwesomeIcon icon={faArrowLeft} /> Go Back
        </button>
      </div>
    );
  }

  const methodInfo = getPaymentMethodInfo(payment.paymentMethod);
  const statusInfo = getStatusInfo(payment.status);
  const appointmentDateToUse = (payment.appointment && payment.appointment.date) 
    ? formatDateStandard(combineDateTime(payment.appointment.date, payment.appointment.time)) 
    : formatDateStandard(payment.createdAt); // Fallback if appointment or appointment.date is missing

  return (
    <div className="payment-details-container">
      <div className="payment-details-header">
        <button onClick={() => navigate(-1)} className="details-back-button icon-button" aria-label="Go back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1>Payment Details</h1>
      </div>

      <div className="payment-details-content">
        <div className="details-card amount-card">
          <div className="amount-info">
            <span className="amount-label">Amount</span>
            <span className="amount-value">{payment.amount.toFixed(2)} €</span>
            <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
        </div>

        <div className="details-card appointment-details-card">
          <h2>Appointment Details</h2>
          <div className="detail-item">
            <FontAwesomeIcon icon={faPerson} className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Patient</span>
              <span className="detail-value">{getPatientName(payment)}</span>
            </div>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faCalendarDays} className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Date</span>
              <span className="detail-value">{appointmentDateToUse}</span>
            </div>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faStethoscope} className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Service Type</span>
              <span className="detail-value">{payment.appointment?.notes || 'Standard Consultation'}</span>
            </div>
          </div>
        </div>

        <div className="details-card payment-info-card">
          <h2>Payment Information</h2>
          <div className="detail-item">
            <FontAwesomeIcon icon={methodInfo.icon} className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Payment Method</span>
              <span className="detail-value">{methodInfo.label}</span>
            </div>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faKey} className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Transaction ID</span>
              <span className="detail-value">{payment.transactionId}</span>
            </div>
          </div>
          <div className="detail-item">
            <FontAwesomeIcon icon={faClock} className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Payment Date</span>
              <span className="detail-value">{formatDateStandard(payment.paymentDate || payment.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPaymentDetails;
