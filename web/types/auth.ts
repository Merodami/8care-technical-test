export type RoleName = 'SUPER_ADMIN' | 'COORDINATOR' | 'CAREGIVER' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  isOtpEnabled: boolean;
  roles: RoleName[];
  permissions: string[];
  profile?: Profile;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  address?: string;
  dateOfBirth?: string;
  caregiverProfile?: CaregiverProfile;
  patientProfile?: PatientProfile;
  coordinatorProfile?: CoordinatorProfile;
}

export interface CaregiverProfile {
  id: string;
  profileId: string;
  licenseNumber?: string;
  specialization?: string;
  yearsOfExperience?: number;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'OFF_DUTY';
}

export interface PatientProfile {
  id: string;
  profileId: string;
  medicalRecordNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  medicalConditions?: string;
}

export interface CoordinatorProfile {
  id: string;
  profileId: string;
  department?: string;
  employeeId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface PartialAuthResponse {
  partialToken: string;
  otpRequired: boolean;
}

export interface OTPVerificationData {
  code: string;
  partialToken: string;
}
