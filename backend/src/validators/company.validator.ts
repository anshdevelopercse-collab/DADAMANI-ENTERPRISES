import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

// Only the firm name and an internal code are required. Every legal/contact
// field is optional: none of it has been confirmed by the client.
const companyFields = {
  name: z.string().trim().min(2, 'Firm name is required').max(200),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/, 'Code must be 2-20 characters: letters, digits or hyphen'),
  isPrimary: z.boolean().optional(),
  registrationNumber: optionalText(50),
  gstNumber: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'GST number must be a valid 15-character GSTIN')
      .optional()
  ),
  panNumber: z.preprocess(
    emptyToUndefined,
    z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN must be in the format AAAAA9999A').optional()
  ),
  email: z.preprocess(emptyToUndefined, z.string().trim().email('Invalid email address').max(200).optional()),
  phone: optionalText(30),
  address: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  isActive: z.boolean().optional(),
};

// Unknown keys (e.g. _id, createdAt sent back by an edit form) are stripped, never persisted.
export const CompanyCreateSchema = z.object(companyFields);

export const CompanyUpdateSchema = z
  .object(companyFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'No updatable fields supplied' });
