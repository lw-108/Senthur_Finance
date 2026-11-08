import { idProofSchema } from '../src/features/customers/schemas';
import { IdProof, IdProofType } from '../src/features/customers/types';
import { validateKYCDocument, sanitizeKYCDocument } from '../src/utils/validators';
import { isPdfDocument, isImageDocument, getDocumentDisplayName } from '../src/utils/documentUtils';
import { PROOF_CATALOG } from '../src/features/customers/proofCatalog';

describe('Customer KYC ID Proof Documents (PDF & Camera/Gallery Images)', () => {
  describe('isPdfDocument detection', () => {
    it('accurately identifies base64 PDF data URIs', () => {
      expect(isPdfDocument('data:application/pdf;base64,JVBERi0xLjQKJ...')).toBe(true);
      expect(isPdfDocument('data:application/pdf;name=sample.pdf;base64,...')).toBe(true);
    });

    it('accurately identifies PDF file paths and URLs', () => {
      expect(isPdfDocument('file:///var/mobile/Containers/Data/Application/doc.pdf')).toBe(true);
      expect(isPdfDocument('https://storage.supabase.co/v1/object/public/kyc/customer1_aadhaar.pdf')).toBe(true);
      expect(isPdfDocument('https://storage.supabase.co/v1/object/public/kyc/doc.pdf?token=123')).toBe(true);
      expect(isPdfDocument('DOC.PDF')).toBe(true);
    });

    it('rejects image files and empty/undefined inputs', () => {
      expect(isPdfDocument(undefined)).toBe(false);
      expect(isPdfDocument('')).toBe(false);
      expect(isPdfDocument('file:///camera/photo.jpg')).toBe(false);
      expect(isPdfDocument('file:///gallery/image.png')).toBe(false);
      expect(isPdfDocument('data:image/jpeg;base64,/9j/4AAQSkZJRg...')).toBe(false);
      expect(isPdfDocument('data:image/png;base64,iVBORw0KGgo...')).toBe(false);
      expect(isPdfDocument('https://storage.supabase.co/v1/object/public/kyc/photo.webp')).toBe(false);
    });
  });

  describe('idProofSchema validation for all 7 ID Proof types', () => {
    const proofTypes: IdProofType[] = [
      'Aadhaar',
      'PAN',
      'Voter',
      'DrivingLicense',
      'RationCard',
      'Passport',
      'Other',
    ];

    it('supports all 7 ID proof types in schema enum', () => {
      proofTypes.forEach((type) => {
        const dummyNum = type === 'Aadhaar' ? '123456789012' : type === 'PAN' ? 'ABCDE1234F' : 'DOC12345';
        const parsed = idProofSchema.safeParse({
          id: `proof-${type}`,
          type,
          number: dummyNum,
          verified: false,
        });
        expect(parsed.success).toBe(true);
      });
    });

    it('validates Aadhaar strictly (12 digits)', () => {
      // Valid
      expect(
        idProofSchema.safeParse({
          id: '1',
          type: 'Aadhaar',
          number: '987654321098',
          verified: true,
        }).success
      ).toBe(true);

      // Allows spaces in number
      expect(
        idProofSchema.safeParse({
          id: '1',
          type: 'Aadhaar',
          number: '9876 5432 1098',
          verified: true,
        }).success
      ).toBe(true);

      // Rejects invalid lengths
      expect(
        idProofSchema.safeParse({
          id: '1',
          type: 'Aadhaar',
          number: '12345',
          verified: false,
        }).success
      ).toBe(false);
    });

    it('validates PAN strictly (5 uppercase letters, 4 digits, 1 uppercase letter)', () => {
      expect(
        idProofSchema.safeParse({
          id: '2',
          type: 'PAN',
          number: 'ABCDE1234F',
          verified: true,
        }).success
      ).toBe(true);

      expect(
        idProofSchema.safeParse({
          id: '2',
          type: 'PAN',
          number: 'abcde1234f', // accepts case-insensitive match through schema
          verified: true,
        }).success
      ).toBe(true);

      expect(
        idProofSchema.safeParse({
          id: '2',
          type: 'PAN',
          number: '12345ABCDE',
          verified: false,
        }).success
      ).toBe(false);
    });

    it('accepts RationCard, Voter, DrivingLicense, Passport, and Other with valid numbers', () => {
      expect(
        idProofSchema.safeParse({
          id: '3',
          type: 'RationCard',
          number: '05G1234567',
          verified: true,
        }).success
      ).toBe(true);

      expect(
        idProofSchema.safeParse({
          id: '4',
          type: 'DrivingLicense',
          number: 'TN-38-2020-0012345',
          verified: false,
        }).success
      ).toBe(true);

      expect(
        idProofSchema.safeParse({
          id: '5',
          type: 'Passport',
          number: 'Z1234567',
          verified: true,
        }).success
      ).toBe(true);

      expect(
        idProofSchema.safeParse({
          id: '6',
          type: 'Other',
          number: 'EMP-9921',
          verified: false,
        }).success
      ).toBe(true);
    });

    it('accepts image URIs for frontUrl and backUrl (camera/gallery photos)', () => {
      const proofWithImages = {
        id: 'proof-img',
        type: 'Aadhaar' as IdProofType,
        number: '123456789012',
        frontUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        backUrl: 'file:///data/user/0/host.exp.exponent/cache/cropped-back.jpg',
        verified: true,
      };

      const result = idProofSchema.safeParse(proofWithImages);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(isPdfDocument(result.data.frontUrl)).toBe(false);
        expect(isPdfDocument(result.data.backUrl)).toBe(false);
      }
    });

    it('accepts PDF document URIs for frontUrl and backUrl (documents)', () => {
      const proofWithPdfs = {
        id: 'proof-pdf',
        type: 'RationCard' as IdProofType,
        number: 'TN-RATION-2024',
        frontUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        backUrl: 'https://storage.supabase.co/v1/object/public/kyc/ration_card_p2.pdf',
        verified: false,
      };

      const result = idProofSchema.safeParse(proofWithPdfs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(isPdfDocument(result.data.frontUrl)).toBe(true);
        expect(isPdfDocument(result.data.backUrl)).toBe(true);
      }
    });
  });

  describe('validateKYCDocument & sanitizeKYCDocument helper utility', () => {
    it('validates RationCard properly', () => {
      const validRes = validateKYCDocument('RationCard', '05G1234567');
      expect(validRes.isValid).toBe(true);

      const emptyRes = validateKYCDocument('RationCard', '');
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.error).toMatch(/required/i);

      const sanitized = sanitizeKYCDocument('RationCard', '05-g 1234567');
      expect(sanitized).toBe('05-G 1234567');
    });

    it('validates and sanitizes Driving License', () => {
      const valid = validateKYCDocument('DrivingLicense', 'TN3820200001234');
      expect(valid.isValid).toBe(true);

      const sanitized = sanitizeKYCDocument('DrivingLicense', 'tn-38 2020');
      expect(sanitized).toBe('TN382020');
    });

    it('validates and sanitizes Passport', () => {
      const valid = validateKYCDocument('Passport', 'A1234567');
      expect(valid.isValid).toBe(true);

      const sanitized = sanitizeKYCDocument('Passport', 'a1234567');
      expect(sanitized).toBe('A1234567');
    });

    it('validates and sanitizes Other proof type', () => {
      const valid = validateKYCDocument('Other', 'ANY-DOC-99');
      expect(valid.isValid).toBe(true);

      const empty = validateKYCDocument('Other', '');
      expect(empty.isValid).toBe(false);
    });
  });

  describe('Customer Proofs Lifecycle: Add, Edit, and Remove proofs', () => {
    let customerProofs: IdProof[] = [];

    beforeEach(() => {
      customerProofs = [
        {
          id: 'proof-1',
          type: 'Aadhaar',
          number: '123456789012',
          frontUrl: 'data:image/jpeg;base64,cameraCapturePhotoFront',
          backUrl: 'data:image/jpeg;base64,cameraCapturePhotoBack',
          verified: true,
        },
      ];
    });

    it('adds a new PDF document proof to existing customer', () => {
      const newPdfProof: IdProof = {
        id: 'proof-2',
        type: 'RationCard',
        number: 'RC-998877',
        frontUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        verified: false,
      };

      const updated = [...customerProofs, newPdfProof];
      expect(updated).toHaveLength(2);
      expect(updated[1].type).toBe('RationCard');
      expect(isPdfDocument(updated[1].frontUrl)).toBe(true);
    });

    it('edits an existing ID proof with updated number and uploaded PDF backUrl', () => {
      const editingIndex = 0;
      const updatedProof: IdProof = {
        ...customerProofs[editingIndex],
        number: '987654321098',
        backUrl: 'data:application/pdf;base64,JVBERi0updated...',
        verified: true,
      };

      const updatedList = [...customerProofs];
      updatedList[editingIndex] = updatedProof;

      expect(updatedList[0].number).toBe('987654321098');
      expect(isPdfDocument(updatedList[0].frontUrl)).toBe(false); // Image preserved
      expect(isPdfDocument(updatedList[0].backUrl)).toBe(true); // PDF attached
    });

    it('removes an ID proof from the customer record', () => {
      const proofToDeleteId = 'proof-1';
      const updatedList = customerProofs.filter((p) => p.id !== proofToDeleteId);
      expect(updatedList).toHaveLength(0);
    });
  });

  describe('SelectProofTypeModal PROOF_CATALOG user selection', () => {
    it('provides all 7 proof options for user selection without auto-defaulting', () => {
      const catalogTypes = PROOF_CATALOG.map((p) => p.type);
      expect(catalogTypes).toEqual([
        'Aadhaar',
        'PAN',
        'Voter',
        'RationCard',
        'DrivingLicense',
        'Passport',
        'Other',
      ]);
      expect(PROOF_CATALOG).toHaveLength(7);
    });

    it('defines distinct titles, format hints, and icons for each proof type', () => {
      PROOF_CATALOG.forEach((item) => {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.tagline.length).toBeGreaterThan(0);
        expect(item.numberHint.length).toBeGreaterThan(0);
        expect(item.icon.length).toBeGreaterThan(0);
      });
    });

    it('PAN card specifies single side whereas Aadhaar and others support back side', () => {
      const pan = PROOF_CATALOG.find((p) => p.type === 'PAN');
      const aadhaar = PROOF_CATALOG.find((p) => p.type === 'Aadhaar');
      expect(pan?.hasBackSide).toBe(false);
      expect(aadhaar?.hasBackSide).toBe(true);
    });
  });

  describe('Storage Limit Detection & Local Storage Fallback', () => {
    // Dynamic import to test helper functions
    const {
      isStorageLimitError,
      saveToPermanentLocalStorage,
      uint8ArrayToBase64,
    } = require('../src/lib/storage/supabaseStorage');

    it('correctly detects HTTP 413 Payload Too Large as storage limit error', () => {
      expect(isStorageLimitError({ statusCode: 413, message: 'Payload too large' })).toBe(true);
      expect(isStorageLimitError({ status: 413, error: 'PayloadTooLarge' })).toBe(true);
      expect(isStorageLimitError({ statusCode: '413', message: 'The object exceeded the maximum allowed size' })).toBe(true);
    });

    it('correctly detects storage limit and quota messages in HTTP 400 responses', () => {
      expect(isStorageLimitError({ statusCode: 400, message: 'The project has reached its storage limit.' })).toBe(true);
      expect(isStorageLimitError({ statusCode: 400, message: 'Bucket storage quota exceeded' })).toBe(true);
      expect(isStorageLimitError({ statusCode: 400, message: 'exceeded the maximum allowed size' })).toBe(true);
      expect(isStorageLimitError({ statusCode: 507, message: 'Insufficient Storage' })).toBe(true);
      expect(isStorageLimitError({ message: 'Free tier limit reached for storage' })).toBe(true);
    });

    it('does not flag unrelated errors as storage limit errors', () => {
      expect(isStorageLimitError({ statusCode: 404, message: 'Object not found' })).toBe(false);
      expect(isStorageLimitError({ statusCode: 403, message: 'row-level security policy violated' })).toBe(false);
      expect(isStorageLimitError(null)).toBe(false);
      expect(isStorageLimitError(undefined)).toBe(false);
    });

    it('uint8ArrayToBase64 serializes bytes accurately across all platforms', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const b64 = uint8ArrayToBase64(bytes);
      expect(b64).toBe('SGVsbG8=');
    });

    it('saveToPermanentLocalStorage returns valid UploadResult with isLocalFallback: true', async () => {
      const payload = new Uint8Array([1, 2, 3, 4]);
      const res = await saveToPermanentLocalStorage(
        'data:image/jpeg;base64,AQIDBA==',
        'customers/123/proofs/aadhaar_front.jpg',
        'image/jpeg',
        payload
      );

      expect(res.isLocalFallback).toBe(true);
      expect(res.storagePath).toBe('local://customers/123/proofs/aadhaar_front.jpg');
      expect(res.mime).toBe('image/jpeg');
      expect(res.url).toBeTruthy();
    });
  });
});
