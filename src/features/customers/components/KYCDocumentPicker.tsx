import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

interface KYCDocumentPickerProps {
  label: string;
  frontUri?: string;
  backUri?: string;
  onChangeFront: (uri: string) => void;
  onChangeBack?: (uri: string) => void;
  hasBackSide?: boolean;
}

export function KYCDocumentPicker({
  label,
  frontUri,
  backUri,
  onChangeFront,
  onChangeBack,
  hasBackSide = true,
}: KYCDocumentPickerProps) {
  const { colors: dynamicColors } = useTheme();
  const [loadingSide, setLoadingSide] = useState<'front' | 'back' | null>(null);

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch {
      return uri;
    }
  };

  const pickImage = async (side: 'front' | 'back', source: 'camera' | 'library') => {
    try {
      setLoadingSide(side);
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to capture documents.');
          setLoadingSide(null);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawUri = result.assets[0].uri;
        const compressedUri = await compressImage(rawUri);

        if (side === 'front') {
          onChangeFront(compressedUri);
        } else if (onChangeBack) {
          onChangeBack(compressedUri);
        }
      }
    } catch (e) {
      console.warn('Document pick error', e);
    } finally {
      setLoadingSide(null);
    }
  };

  const pickDocument = async (side: 'front' | 'back') => {
    try {
      setLoadingSide(side);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        if (side === 'front') {
          onChangeFront(uri);
        } else if (onChangeBack) {
          onChangeBack(uri);
        }
      }
    } catch (e) {
      console.warn('Doc pick error', e);
    } finally {
      setLoadingSide(null);
    }
  };

  const showPickOptions = (side: 'front' | 'back') => {
    Alert.alert('Upload Document', `Select source for ${side} side`, [
      { text: 'Take Photo', onPress: () => pickImage(side, 'camera') },
      { text: 'Choose from Gallery', onPress: () => pickImage(side, 'library') },
      { text: 'Select PDF Document', onPress: () => pickDocument(side) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: dynamicColors.ink }]}>{label}</Text>

      <View style={styles.sidesRow}>
        {/* Front Side */}
        <View style={styles.sideCard}>
          <Text style={[styles.sideLabel, { color: dynamicColors.textSecondary }]}>Front Side *</Text>
          {frontUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: frontUri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => showPickOptions('front')}
              >
                <Text style={styles.retakeText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.uploadPlaceholder,
                {
                  backgroundColor: dynamicColors.surface,
                  borderColor: dynamicColors.border,
                },
              ]}
              onPress={() => showPickOptions('front')}
              activeOpacity={0.8}
            >
              {loadingSide === 'front' ? (
                <ActivityIndicator color={dynamicColors.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={26} color={dynamicColors.primaryDark} />
                  <Text style={[styles.uploadText, { color: dynamicColors.primaryDark }]}>Capture Front</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Back Side */}
        {hasBackSide && (
          <View style={styles.sideCard}>
            <Text style={[styles.sideLabel, { color: dynamicColors.textSecondary }]}>Back Side (Optional)</Text>
            {backUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: backUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => showPickOptions('back')}
                >
                  <Text style={styles.retakeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.uploadPlaceholder,
                  {
                    backgroundColor: dynamicColors.surface,
                    borderColor: dynamicColors.border,
                  },
                ]}
                onPress={() => showPickOptions('back')}
                activeOpacity={0.8}
              >
                {loadingSide === 'back' ? (
                  <ActivityIndicator color={dynamicColors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={dynamicColors.primaryDark} />
                    <Text style={[styles.uploadText, { color: dynamicColors.primaryDark }]}>Capture Back</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    marginBottom: 8,
  },
  sidesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sideCard: {
    flex: 1,
  },
  sideLabel: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  uploadPlaceholder: {
    height: 105,
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    color: colors.primaryDark,
  },
  previewContainer: {
    height: 105,
    borderRadius: radii.sm + 4,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
