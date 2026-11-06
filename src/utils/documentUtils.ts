/**
 * Pure document utility functions for handling customer KYC proof files (PDFs and Images).
 */

export function isPdfDocument(uri?: string): boolean {
  if (!uri) return false;
  const lower = uri.toLowerCase();
  return (
    lower.startsWith('data:application/pdf') ||
    lower.endsWith('.pdf') ||
    lower.includes('application/pdf') ||
    lower.includes('.pdf?')
  );
}

export function isImageDocument(uri?: string): boolean {
  if (!uri) return false;
  const lower = uri.toLowerCase();
  return (
    lower.startsWith('data:image/') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.includes('.jpg?') ||
    lower.includes('.jpeg?') ||
    lower.includes('.png?')
  );
}

export function getDocumentDisplayName(uri?: string, fallback: string = 'Document'): string {
  if (!uri) return fallback;
  if (isPdfDocument(uri)) {
    return 'PDF Document';
  }
  if (isImageDocument(uri)) {
    return 'Photo / Image';
  }
  return fallback;
}
