// Types pour les interfaces de l'API
export interface AvailabilityData {
  date: string;
  startTime: string;
  endTime: string;
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
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
  patient?: Patient;
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  method: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'Patient' | 'Doctor' | 'Admin';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
} 