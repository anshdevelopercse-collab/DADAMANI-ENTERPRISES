import { z } from 'zod';

export const WorkforceCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['Driver', 'Operator', 'Mechanic', 'Supervisor', 'Other']),
  entity: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['Active', 'On Leave', 'Terminated']).default('Active'),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().or(z.date()).optional(),
  experienceYears: z.number().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  notes: z.string().optional(),
});

export const WorkforceAssignSchema = z.object({
  workOrder: z.string().min(1, 'Work order ID is required'),
  notes: z.string().optional(),
});
