import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface PhotoPickerConfig {
  title?: string;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  hasExistingPhoto?: boolean;
  onPhotoSelected: (uri: string) => void | Promise<void>;
  onPhotoRemoved?: () => void | Promise<void>;
  onError?: (msg: string) => void;
}

/**
 * Optimizes an image asset to a lightweight, square JPEG data URI (~20-30KB)
 * for instant rendering and seamless persistence in Supabase and offline storage.
 */
async function processAndOptimizeImage(
  uri: string,
  targetWidth = 300,
  targetHeight = 300,
  quality = 0.7
): Promise<string> {
  try {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manip.base64 && manip.base64.length > 0) {
      return `data:image/jpeg;base64,${manip.base64}`;
    }

    // Fallback: Read using FileSystem if base64 wasn't returned by manipulator
    if (manip.uri) {
      try {
        const b64 = await FileSystem.readAsStringAsync(manip.uri, {
          encoding: 'base64',
        });
        if (b64 && b64.length > 0) {
          return `data:image/jpeg;base64,${b64}`;
        }
      } catch {}
      return manip.uri;
    }
  } catch (err) {
    console.warn('[PhotoPicker] Optimization error, falling back to raw uri:', err);
  }

  return uri;
}

/**
 * Capture a new photo using the device camera.
 */
export async function capturePhotoFromCamera(
  config: PhotoPickerConfig
): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      config.onError?.('Camera permission is required to capture a photo.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const rawUri = result.assets[0].uri;
    const optimized = await processAndOptimizeImage(
      rawUri,
      config.targetWidth,
      config.targetHeight,
      config.quality
    );

    await config.onPhotoSelected(optimized);
    return optimized;
  } catch (error: any) {
    console.error('[PhotoPicker] Camera capture error:', error);
    config.onError?.('Failed to capture photo from camera.');
    return null;
  }
}

/**
 * Select an existing photo from the device photo gallery / media library.
 */
export async function pickPhotoFromLibrary(
  config: PhotoPickerConfig
): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      config.onError?.('Photo library permission is required to select an image.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const rawUri = result.assets[0].uri;
    const optimized = await processAndOptimizeImage(
      rawUri,
      config.targetWidth,
      config.targetHeight,
      config.quality
    );

    await config.onPhotoSelected(optimized);
    return optimized;
  } catch (error: any) {
    console.error('[PhotoPicker] Gallery pick error:', error);
    config.onError?.('Failed to select photo from gallery.');
    return null;
  }
}

/**
 * Shows a native prompt modal to select between Camera, Gallery, and optional Removal.
 */
export function openPhotoSourcePicker(config: PhotoPickerConfig): void {
  if (Platform.OS === 'web') {
    pickPhotoFromLibrary(config);
    return;
  }

  const buttons: any[] = [
    {
      text: 'Take Photo',
      onPress: () => capturePhotoFromCamera(config),
    },
    {
      text: 'Choose from Gallery',
      onPress: () => pickPhotoFromLibrary(config),
    },
  ];

  if (config.hasExistingPhoto && config.onPhotoRemoved) {
    buttons.push({
      text: 'Remove Photo',
      style: 'destructive',
      onPress: config.onPhotoRemoved,
    });
  }

  buttons.push({
    text: 'Cancel',
    style: 'cancel',
  });

  Alert.alert(
    config.title || 'Profile Picture',
    'Choose a photo source:',
    buttons,
    { cancelable: true }
  );
}
