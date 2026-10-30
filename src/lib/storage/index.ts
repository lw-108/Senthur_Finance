import { SupabaseStorageProvider } from './supabaseStorage';

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadResult {
  url: string;
  storagePath: string;
  sizeBytes?: number;
  mime?: string;
}

export interface StorageProvider {
  uploadFile(
    fileUri: string,
    destinationPath: string,
    mimeType?: string,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult>;

  deleteFile(storagePath: string): Promise<void>;
  getPublicUrl(storagePath: string): Promise<string>;
}

/**
 * Cloudinary Storage Implementation (Optional alternative)
 */
export class CloudinaryStorageProvider implements StorageProvider {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'loanledger';
    this.uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'loanledger_preset';
  }

  async uploadFile(
    fileUri: string,
    destinationPath: string,
    mimeType: string = 'image/jpeg',
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> {
    const formData = new FormData();
    const isPdf = mimeType.includes('pdf');
    const resourceType = isPdf ? 'raw' : 'image';

    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: destinationPath.split('/').pop() || 'upload',
    } as any);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', destinationPath.substring(0, destinationPath.lastIndexOf('/')));

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    onProgress?.(100);

    return {
      url: data.secure_url,
      storagePath: data.public_id,
      sizeBytes: data.bytes,
      mime: mimeType,
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    console.warn('Cloudinary deleteFile should be performed via backend API');
  }

  async getPublicUrl(storagePath: string): Promise<string> {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${storagePath}`;
  }
}

// Factory to get configured StorageProvider (Supabase is standard default)
export function getStorageProvider(): StorageProvider {
  const providerType = (process.env.EXPO_PUBLIC_STORAGE_PROVIDER || 'supabase').toLowerCase();
  if (providerType === 'cloudinary') {
    return new CloudinaryStorageProvider();
  }
  return new SupabaseStorageProvider();
}

export const defaultStorage = getStorageProvider();
export { SupabaseStorageProvider };
