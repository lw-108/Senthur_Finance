import { IdProofType } from './types';

export interface ProofOptionItem {
  type: IdProofType;
  title: string;
  tagline: string;
  numberHint: string;
  icon: string;
  colorScheme: 'primary' | 'success' | 'warning' | 'purple' | 'cyan' | 'indigo' | 'slate';
  hasBackSide: boolean;
}

export const PROOF_CATALOG: ProofOptionItem[] = [
  {
    type: 'Aadhaar',
    title: 'Aadhaar Card',
    tagline: '12-Digit UIDAI identity & address proof with photo',
    numberHint: '12 numeric digits (e.g. 1234 5678 9012)',
    icon: 'card-outline',
    colorScheme: 'primary',
    hasBackSide: true,
  },
  {
    type: 'PAN',
    title: 'PAN Card',
    tagline: 'Permanent Account Number issued by Income Tax Dept',
    numberHint: '10 characters (e.g. ABCDE1234F)',
    icon: 'document-text-outline',
    colorScheme: 'success',
    hasBackSide: false,
  },
  {
    type: 'Voter',
    title: 'Voter ID Card',
    tagline: 'Election Commission of India EPIC identity card',
    numberHint: '10-character EPIC ID (e.g. ABC1234567)',
    icon: 'finger-print-outline',
    colorScheme: 'purple',
    hasBackSide: true,
  },
  {
    type: 'RationCard',
    title: 'Ration Card / Smart Card',
    tagline: 'Civil Supplies family card / Smart Ration Card',
    numberHint: 'Smart card / family card number',
    icon: 'receipt-outline',
    colorScheme: 'warning',
    hasBackSide: true,
  },
  {
    type: 'DrivingLicense',
    title: 'Driving License',
    tagline: 'RTO motor vehicle driving license with chip/photo',
    numberHint: 'State code + RTO license number',
    icon: 'car-outline',
    colorScheme: 'cyan',
    hasBackSide: true,
  },
  {
    type: 'Passport',
    title: 'Passport',
    tagline: 'Ministry of External Affairs international travel proof',
    numberHint: '8-character passport code (e.g. A1234567)',
    icon: 'globe-outline',
    colorScheme: 'indigo',
    hasBackSide: true,
  },
  {
    type: 'Other',
    title: 'Other Govt / Property Proof',
    tagline: 'Patta, Chitta, EB Card, Bank Passbook or Legal Deed',
    numberHint: 'Document registration / reference number',
    icon: 'document-attach-outline',
    colorScheme: 'slate',
    hasBackSide: true,
  },
];
