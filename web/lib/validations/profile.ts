import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export const caregiverProfileSchema = profileSchema.extend({
  licenseNumber: z.string().optional(),
  specialization: z.string().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE', 'OFF_DUTY']).optional(),
});

export const patientProfileSchema = profileSchema.extend({
  medicalRecordNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
});

export const coordinatorProfileSchema = profileSchema.extend({
  department: z.string().optional(),
  employeeId: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type CaregiverProfileFormData = z.infer<typeof caregiverProfileSchema>;
export type PatientProfileFormData = z.infer<typeof patientProfileSchema>;
export type CoordinatorProfileFormData = z.infer<typeof coordinatorProfileSchema>;
