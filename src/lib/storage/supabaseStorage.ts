import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { StorageProvider, UploadProgressCallback, UploadResult } from './index';

/**
 * Robust base64 to Uint8Array converter that runs reliably across React Native (iOS, Android) and Web.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    try {
      const binary = globalThis.atob(base64.replace(/\s/g, ''));
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {}
  }

  // Pure JavaScript base64 decoding fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = chars.indexOf(clean[i]);
    const c2 = chars.indexOf(clean[i + 1]);
    const c3 = chars.indexOf(clean[i + 2]);
    const c4 = chars.indexOf(clean[i + 3]);
    bytes[p++] = (c1 << 2) | (c2 >> 4);
    if (c3 !== -1 && c3 !== 64) bytes[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (c4 !== -1 && c4 !== 64) bytes[p++] = ((c3 & 3) << 6) | (c4 & 63);
  }
  return bytes.subarray(0, p);
}

/**
 * Robust Uint8Array to base64 string converter for cross-platform serialization.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    try {
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      return globalThis.btoa(binary);
    } catch {}
  }

  // Pure JavaScript base64 encoding fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < len ? chars[b3 & 63] : '=';
  }
  return result;
}

/**
 * Checks whether an error from Supabase Storage represents a size limit, quota exhaustion,
 * payload-too-large rejection (413), or bucket capacity exceeded.
 */
export function isStorageLimitError(error: any): boolean {
  if (!error) return false;

  const status = error.statusCode || error.status || error.code;
  const statusNum = typeof status === 'number' ? status : parseInt(status, 10);
  if (statusNum === 413 || statusNum === 507) {
    return true;
  }

  const msg = (
    (error.message || '') +
    ' ' +
    (error.error || '') +
    ' ' +
    (error.details || '') +
    ' ' +
    (typeof error === 'string' ? error : '')
  ).toLowerCase();

  return (
    msg.includes('payload too large') ||
    msg.includes('too large') ||
    msg.includes('exceeded the maximum allowed size') ||
    msg.includes('exceeded maximum allowed size') ||
    msg.includes('exceeded the maximum') ||
    msg.includes('maximum allowed size') ||
    msg.includes('file size limit') ||
    msg.includes('storage limit') ||
    msg.includes('storage quota') ||
    msg.includes('quota exceeded') ||
    msg.includes('limit reached') ||
    msg.includes('limit exceeded') ||
    msg.includes('entity too large') ||
    msg.includes('insufficient storage') ||
    msg.includes('bucket size') ||
    msg.includes('resource limit') ||
    msg.includes('project storage limit') ||
    msg.includes('maximum capacity') ||
    msg.includes('storage full') ||
    msg.includes('free tier limit')
  );
}

/**
 * Saves a document or proof file permanently to local device storage.
 * - On Native iOS/Android: Writes permanently to FileSystem.documentDirectory + 'proofs/'
 * - On Web: Preserves the data URI / in-memory buffer representation
 */
export async function saveToPermanentLocalStorage(
  fileUri: string,
  destinationPath: string,
  mimeType: string = 'image/jpeg',
  uploadPayload?: Uint8Array
): Promise<UploadResult> {
  const safePath = destinationPath.replace(/^\/+/, '');
  const filename =
    safePath.split('/').pop() || `proof_${Date.now()}.${mimeType.includes('pdf') ? 'pdf' : 'jpg'}`;

  // On Native (iOS / Android) where FileSystem.documentDirectory is persistent across restarts
  if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
    try {
      const proofsDir = `${FileSystem.documentDirectory}proofs/`;
      const dirInfo = await FileSystem.getInfoAsync(proofsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(proofsDir, { intermediates: true });
      }

      const targetPath = `${proofsDir}${filename}`;

      // If source is already a local file://, attempt fast file copy
      let copied = false;
      if (fileUri.startsWith('file://')) {
        try {
          await FileSystem.copyAsync({ from: fileUri, to: targetPath });
          copied = true;
        } catch (copyErr) {
          console.warn('[Storage Local Fallback] File copy failed, falling back to write:', copyErr);
        }
      }

      // If not copied, write base64 to target
      if (!copied) {
        let base64Content = '';
        if (uploadPayload && uploadPayload.length > 0) {
          base64Content = uint8ArrayToBase64(uploadPayload);
        } else if (fileUri.startsWith('data:')) {
          const commaIdx = fileUri.indexOf(',');
          base64Content = commaIdx !== -1 ? fileUri.substring(commaIdx + 1) : fileUri;
        } else {
          base64Content = await FileSystem.readAsStringAsync(fileUri, {
            encoding: 'base64' as any,
          });
        }

        await FileSystem.writeAsStringAsync(targetPath, base64Content, {
          encoding: 'base64' as any,
        });
      }

      const targetInfo = await FileSystem.getInfoAsync(targetPath);
      const sizeBytes =
        targetInfo.exists && !targetInfo.isDirectory
          ? targetInfo.size
          : uploadPayload?.byteLength || 0;

      return {
        url: targetPath,
        storagePath: `local://${safePath}`,
        sizeBytes,
        mime: mimeType,
        isLocalFallback: true,
      };
    } catch (fsErr) {
      console.warn('[Storage Local Fallback] Native FileSystem save error, falling back to data URI:', fsErr);
    }
  }

  // Web or Fallback environment: generate permanent data URI
  let finalDataUrl = fileUri;
  if (!fileUri.startsWith('data:') && uploadPayload && uploadPayload.length > 0) {
    const base64 = uint8ArrayToBase64(uploadPayload);
    finalDataUrl = `data:${mimeType};base64,${base64}`;
  }

  return {
    url: finalDataUrl,
    storagePath: `local://${safePath}`,
    sizeBytes: uploadPayload?.byteLength || 0,
    mime: mimeType,
    isLocalFallback: true,
  };
}

export class SupabaseStorageProvider implements StorageProvider {
  private bucket = 'documents';

  async uploadFile(
    fileUri: string,
    destinationPath: string,
    mimeType: string = 'image/jpeg',
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> {
    // Clean, direct path so folders are immediately visible and navigable:
    // e.g. customers/{customerId}/proofs/aadhaar_front.jpg
    const safePath = destinationPath.replace(/^\/+/, '');

    if (!isSupabaseConfigured()) {
      // In offline/unconfigured mode, persist to permanent local storage
      const localResult = await saveToPermanentLocalStorage(fileUri, safePath, mimeType);
      onProgress?.(100);
      return localResult;
    }

    onProgress?.(25);

    // Read file bytes properly across Web and Native (React Native Android cannot fetch file://)
    let uploadPayload: Uint8Array;
    let byteSize = 0;

    try {
      if (fileUri.startsWith('data:')) {
        const commaIndex = fileUri.indexOf(',');
        const base64 = commaIndex !== -1 ? fileUri.substring(commaIndex + 1) : fileUri;
        const bytes = base64ToUint8Array(base64);
        uploadPayload = bytes;
        byteSize = bytes.byteLength;
      } else if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const arrayBuffer = await response.arrayBuffer();
        uploadPayload = new Uint8Array(arrayBuffer);
        byteSize = uploadPayload.byteLength;
      } else {
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });
        const bytes = base64ToUint8Array(base64);
        uploadPayload = bytes;
        byteSize = bytes.byteLength;
      }
    } catch (readErr) {
      console.warn('[Supabase Storage] File read error, attempting direct local save:', readErr);
      const localResult = await saveToPermanentLocalStorage(fileUri, safePath, mimeType);
      onProgress?.(100);
      return localResult;
    }

    onProgress?.(45);

    // Proactive check: If file exceeds Supabase hard limit (50MB), save directly to local storage
    if (byteSize > 50 * 1024 * 1024) {
      console.warn(`[Supabase Storage] File size (${byteSize} bytes) exceeds 50MB Supabase limit. Saving to local storage.`);
      const localResult = await saveToPermanentLocalStorage(
        fileUri,
        safePath,
        mimeType,
        uploadPayload
      );
      onProgress?.(100);
      return localResult;
    }

    try {
      const { error } = await supabase.storage
        .from(this.bucket)
        .upload(safePath, uploadPayload, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        // If Supabase size limit or quota is reached, gracefully fall back to local storage
        if (isStorageLimitError(error)) {
          console.warn(
            `[Supabase Storage] Storage size limit reached. Falling back to persistent local device storage:`,
            error
          );
          const localResult = await saveToPermanentLocalStorage(
            fileUri,
            safePath,
            mimeType,
            uploadPayload
          );
          onProgress?.(100);
          return localResult;
        }

        const errMsg = (error as any)?.message || String(error);
        const errStatus = (error as any)?.statusCode || (error as any)?.status;
        console.warn(`[Supabase Storage] Upload error to bucket '${this.bucket}' path '${safePath}':`, {
          message: errMsg,
          statusCode: errStatus,
          details: error,
        });

        if (errStatus === 403 || errStatus === '403' || errMsg.toLowerCase().includes('security policy')) {
          throw new Error(
            `Supabase RLS AccessDenied (403): Storage policy not set for bucket '${this.bucket}'. Please run the Supabase SQL policy script.`
          );
        }

        throw new Error(`Upload failed (${errStatus || '400'}): ${errMsg}`);
      }
    } catch (uploadErr: any) {
      // Check if the thrown exception is a storage size/quota limit error
      if (isStorageLimitError(uploadErr)) {
        console.warn(
          `[Supabase Storage] Storage size limit error caught. Falling back to persistent local storage:`,
          uploadErr
        );
        const localResult = await saveToPermanentLocalStorage(
          fileUri,
          safePath,
          mimeType,
          uploadPayload
        );
        onProgress?.(100);
        return localResult;
      }
      throw uploadErr;
    }

    onProgress?.(85);

    // Get public URL or generate signed URL for authorized access
    const { data: pubData } = supabase.storage.from(this.bucket).getPublicUrl(safePath);
    let accessUrl = pubData?.publicUrl;

    if (!accessUrl || accessUrl.includes('undefined')) {
      const { data: signedData } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(safePath, 86400); // 24 hours
      accessUrl = signedData?.signedUrl || fileUri;
    }

    onProgress?.(100);

    return {
      url: accessUrl,
      storagePath: safePath,
      sizeBytes: byteSize,
      mime: mimeType,
      isLocalFallback: false,
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    // If file was stored locally due to limit fallback, remove from device storage
    if (storagePath.startsWith('local://') || storagePath.startsWith('file:')) {
      try {
        const cleanPath = storagePath.replace(/^local:\/\//, '');
        const filename = cleanPath.split('/').pop() || '';
        if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
          const localPath = `${FileSystem.documentDirectory}proofs/${filename}`;
          const info = await FileSystem.getInfoAsync(localPath);
          if (info.exists) {
            await FileSystem.deleteAsync(localPath, { idempotent: true });
          }
        }
      } catch (e) {
        console.warn('[Supabase Storage] Failed to delete local fallback file:', e);
      }
      return;
    }

    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.storage.from(this.bucket).remove([storagePath]);
    if (error) {
      console.warn(`[Supabase Storage] Delete failed for ${storagePath}:`, error.message);
    }
  }

  async getPublicUrl(storagePath: string): Promise<string> {
    if (
      storagePath.startsWith('local://') ||
      storagePath.startsWith('file:') ||
      storagePath.startsWith('data:') ||
      storagePath.startsWith('blob:') ||
      storagePath.startsWith('http://') ||
      storagePath.startsWith('https://')
    ) {
      if (storagePath.startsWith('local://')) {
        const cleanPath = storagePath.replace(/^local:\/\//, '');
        const filename = cleanPath.split('/').pop() || '';
        if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
          return `${FileSystem.documentDirectory}proofs/${filename}`;
        }
      }
      return storagePath;
    }

    if (!isSupabaseConfigured()) return storagePath;

    // Documents bucket is public/private; create a signed URL or get public URL
    const { data: pubData } = supabase.storage.from(this.bucket).getPublicUrl(storagePath);
    if (pubData?.publicUrl && !pubData.publicUrl.includes('undefined')) {
      return pubData.publicUrl;
    }

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      return storagePath;
    }

    return data.signedUrl;
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (
      storagePath.startsWith('local://') ||
      storagePath.startsWith('file:') ||
      storagePath.startsWith('data:') ||
      storagePath.startsWith('blob:') ||
      storagePath.startsWith('http://') ||
      storagePath.startsWith('https://')
    ) {
      return this.getPublicUrl(storagePath);
    }

    if (!isSupabaseConfigured()) return storagePath;

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }
}
