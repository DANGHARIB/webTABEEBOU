// Types pour les interfaces de l'API
export interface AvailabilityData {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface AppointmentData {
  doctorId: string;
  date: string;
  time: string;
  notes?: string;
}

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

export interface SearchParams {
  specialty?: string;
  location?: string;
  date?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Types spécifiques pour les réponses des endpoints
export interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  address: string;
  phone: string;
  email: string;
  bio?: string;
  profileImage?: string;
  approved: boolean;
  ratings?: number;
  reviews?: number;
}

export interface Patient {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string[];
  medicalHistory?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface Appointment {
  _id: string;
  doctor: string | Doctor; // Can be either the doctor ID or a Doctor object
  patient: {
    _id: string;
    first_name?: string;
    last_name?: string;
  } | Patient; // Can be either a simple object or a full Patient object
  availability: {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  slotStartTime: string;
  slotEndTime: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'reschedule_requested' | 'scheduled';
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed';
  sessionLink?: string;
  caseDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  appointment?: Appointment; // Full appointment details
  patient?: Patient; // Full patient details, often part of appointment
  amount: number;
  paymentMethod: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | string; // Specific payment methods
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  transactionId: string; // Made non-optional as it's crucial for display
  paymentDate: string; // Date of the payment transaction itself
  createdAt: string; // Record creation timestamp
  updatedAt: string; // Record update timestamp
  // Optional fields for UI logic, potentially derived or from API
  isRefund?: boolean; 
  refundDetails?: {
    amount: number; // Amount refunded
    refundDate?: string;
    reason?: string;
  };
  displayAmount?: number; // For UI to show, could be original or net after refund
}

// Specific structure for the response from /doctors/profile endpoint
export interface DoctorProfileDetail {
  _id: string;
  first_name: string;
  last_name: string;
  specialization: string; // This is an ID
  address?: string; // Assuming it might exist or be added
  phone?: string;   // Assuming it might exist or be added
  about?: string; // Corresponds to bio
  doctor_image?: string; // Corresponds to profileImage
  verified?: boolean; // Corresponds to approved status
  // Add any other fields present in the 'profile' object from the logs
  dob?: string;
  experience?: number;
  price?: number;
  profileCompleted?: boolean;
  verificationStatus?: string;
  // certifications, education, etc. can be added if needed for typing
}

export interface UserProfileDetail {
  _id: string;
  email: string;
  fullName?: string; // As seen in logs
  role?: string;
  // Add any other fields present in the 'user' object from the logs
}

export interface DoctorProfileApiResponse {
  user: UserProfileDetail;
  profile: DoctorProfileDetail;
  // This structure does not have 'success', 'data', or 'message' fields directly
}

export interface User {
  id: string;
  email: string;
  role: 'Patient' | 'Doctor' | 'Admin';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
} 