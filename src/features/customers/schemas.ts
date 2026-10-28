import { z } from 'zod';

// Phone number: optional country code + 10 digits
const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

// PAN regex: 5 uppercase letters, 4 digits, 1 uppercase letter
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Aadhaar regex: 12 digits
const aadhaarRegex = /^\d{12}$/;

export const idProofSchema = z.object({
  id: z.string(),
  type: z.enum(['Aadhaar', 'PAN', 'Voter', 'DrivingLicense', 'Passport', 'Other']),
  number: z.string().min(1, 'ID number is required'),
  frontUrl: z.string().optional(),
  backUrl: z.string().optional(),
  storagePath: z.string().optional(),
  verified: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.type === 'Aadhaar') {
      const clean = data.number.replace(/\s+/g, '');
      return aadhaarRegex.test(clean);
    }
    if (data.type === 'PAN') {
      return panRegex.test(data.number.trim().toUpperCase());
    }
    return data.number.length >= 4;
  },
  {
    message: 'Invalid ID number format for selected ID type',
    path: ['number'],
  }
);

export const customerBasicSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  nickname: z.string().optional(),
  phone: z.string().regex(phoneRegex, 'Enter valid 10-digit Indian mobile number'),
  altPhone: z.string().optional(),
  email: z.string().email('Enter valid email').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  photoUrl: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
  occupation: z.string().optional(),
  monthlyIncome: z.number().optional(),
});

export const customerAddressSchema = z.object({
  line1: z.string().min(3, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().default('Tamil Nadu'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode'),
});

export const customerGuarantorSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  idProofUrl: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const customerReferenceSchema = z.object({
  name: z.string().min(2, 'Reference name is required'),
  relation: z.string().min(2, 'Relation is required'),
  phone: z.string().regex(phoneRegex, 'Enter valid phone number'),
  address: z.string().optional(),
});

export const completeCustomerSchema = z.object({
  basic: customerBasicSchema,
  address: customerAddressSchema,
  idProofs: z.array(idProofSchema).min(1, 'At least 1 ID proof is recommended'),
  references: z.array(customerReferenceSchema).optional().default([]),
  guarantor: customerGuarantorSchema.optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type CustomerBasicFormData = z.infer<typeof customerBasicSchema>;
export type CustomerAddressFormData = z.infer<typeof customerAddressSchema>;
export type CompleteCustomerFormData = z.infer<typeof completeCustomerSchema>;
