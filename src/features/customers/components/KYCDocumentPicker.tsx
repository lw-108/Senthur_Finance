import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import { isPdfDocument, isImageDocument, getDocumentDisplayName } from '@/utils/documentUtils';

export { isPdfDocument, isImageDocument, getDocumentDisplayName };

export async function openOrShareDocument(uri: string, title: string = 'Document') {
  try {
    const isPdf = isPdfDocument(uri);
    if (Platform.OS === 'web') {
      if (uri.startsWith('data:')) {
        const win = window.open();
        if (win) {
          if (isPdf) {
            win.document.write(
              `<iframe src="${uri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
            );
          } else {
            win.document.write(`<img src="${uri}" style="max-width:100%; height:auto;" />`);
          }
          return;
        }
      }
      window.open(uri, '_blank');
      return;
    }

    // On native iOS / Android:
    if (isPdf && uri.startsWith('data:application/pdf;base64,')) {
      const base64Data = uri.replace('data:application/pdf;base64,', '');
      const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
      const tempPath = `${cacheDir}${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      await (FileSystem as any).writeAsStringAsync(tempPath, base64Data, {
        encoding: 'base64',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempPath, {
          mimeType: 'application/pdf',
          dialogTitle: `View ${title}`,
        });
      } else {
        await Linking.openURL(tempPath);
      }
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `View ${title}`,
      });
    } else {
      await Linking.openURL(uri);
    }
  } catch (err) {
    console.warn('Could not open document:', err);
    Alert.alert('Notice', 'Unable to open document. Sharing sheet was not accessible.');
  }
}

export interface DocumentPreviewModalProps {
  visible: boolean;
  uri?: string;
  title?: string;
  onClose: () => void;
}

export function DocumentPreviewModal({ visible, uri, title = 'Document Preview', onClose }: DocumentPreviewModalProps) {
  const { colors: dynamicColors } = useTheme();
  if (!uri) return null;
  const isPdf = isPdfDocument(uri);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={previewStyles.overlay}>
        <View style={[previewStyles.modalBox, { backgroundColor: dynamicColors.surface }]}>
          {/* Header */}
          <View style={[previewStyles.header, { borderBottomColor: dynamicColors.border }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[previewStyles.title, { color: dynamicColors.ink }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[previewStyles.subtitle, { color: dynamicColors.textSecondary }]}>
                {isPdf ? 'PDF Document' : 'Image Photo Proof'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={previewStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={dynamicColors.ink} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={previewStyles.body}>
            {isPdf ? (
              <View style={previewStyles.pdfContainer}>
                <View style={[previewStyles.pdfIconCircle, { backgroundColor: dynamicColors.primarySoft }]}>
                  <Ionicons name="document-text" size={48} color={dynamicColors.primaryDark} />
                </View>
                <Text style={[previewStyles.pdfFileName, { color: dynamicColors.ink }]}>{title}.pdf</Text>
                <Text style={[previewStyles.pdfDesc, { color: dynamicColors.textSecondary }]}>
                  Full-page PDF ID proof document attached securely.
                </Text>
                <TouchableOpacity
                  style={[previewStyles.openPdfBtn, { backgroundColor: dynamicColors.primary }]}
                  onPress={() => openOrShareDocument(uri, title)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={previewStyles.openPdfText}>Open / View Full PDF</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                contentContainerStyle={previewStyles.imageScrollContainer}
              >
                <Image source={{ uri }} style={previewStyles.fullImage} resizeMode="contain" />
              </ScrollView>
            )}
          </View>

          {/* Footer Actions */}
          <View style={[previewStyles.footer, { borderTopColor: dynamicColors.border }]}>
            <TouchableOpacity
              style={[previewStyles.actionBtn, { borderColor: dynamicColors.border }]}
              onPress={() => openOrShareDocument(uri, title)}
            >
              <Ionicons name="share-outline" size={18} color={dynamicColors.ink} style={{ marginRight: 6 }} />
              <Text style={[previewStyles.actionBtnText, { color: dynamicColors.ink }]}>Share / Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[previewStyles.actionBtnPrimary, { backgroundColor: dynamicColors.primary }]}
              onPress={onClose}
            >
              <Text style={previewStyles.actionBtnPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export interface KYCDocumentPickerProps {
  label: string;
  frontUri?: string;
  backUri?: string;
  frontName?: string;
  backName?: string;
  onChangeFront: (uri: string, name?: string) => void;
  onChangeBack?: (uri: string, name?: string) => void;
  hasBackSide?: boolean;
  disabled?: boolean;
}

export function KYCDocumentPicker({
  label,
  frontUri,
  backUri,
  frontName,
  backName,
  onChangeFront,
  onChangeBack,
  hasBackSide = true,
  disabled = false,
}: KYCDocumentPickerProps) {
  const { colors: dynamicColors } = useTheme();
  const [loadingSide, setLoadingSide] = useState<'front' | 'back' | null>(null);
  const [pickSourceSide, setPickSourceSide] = useState<'front' | 'back' | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Proof Document');

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipResult.base64 && manipResult.base64.length > 0) {
        return `data:image/jpeg;base64,${manipResult.base64}`;
      }
      return manipResult.uri;
    } catch {
      return uri;
    }
  };

  const pickImage = async (side: 'front' | 'back', source: 'camera' | 'library') => {
    if (disabled) return;
    try {
      setLoadingSide(side);
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission Needed', 'Please allow camera access in device settings to take photo proofs.');
          setLoadingSide(null);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: false,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedUri = await compressImage(asset.uri);
        const name = asset.fileName || (source === 'camera' ? 'camera_photo.jpg' : 'gallery_image.jpg');

        if (side === 'front') {
          onChangeFront(compressedUri, name);
        } else if (onChangeBack) {
          onChangeBack(compressedUri, name);
        }
      }
    } catch (e) {
      console.warn('Document pick error', e);
      Alert.alert('Upload Error', 'Failed to capture or select photo. Please try again.');
    } finally {
      setLoadingSide(null);
    }
  };

  const pickDocument = async (side: 'front' | 'back') => {
    if (disabled) return;
    try {
      setLoadingSide(side);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const isPdf =
          asset.mimeType === 'application/pdf' ||
          asset.name?.toLowerCase().endsWith('.pdf') ||
          asset.uri.toLowerCase().endsWith('.pdf');

        let finalUri = asset.uri;

        if (isPdf) {
          try {
            if (Platform.OS !== 'web') {
              const b64 = await (FileSystem as any).readAsStringAsync(asset.uri, {
                encoding: 'base64',
              });
              if (b64 && b64.length > 0) {
                finalUri = `data:application/pdf;base64,${b64}`;
              }
            }
          } catch (err) {
            console.warn('[KYCDocumentPicker] PDF base64 conversion warning:', err);
            finalUri = asset.uri;
          }
        } else {
          finalUri = await compressImage(asset.uri);
        }

        const name = asset.name || (isPdf ? 'document.pdf' : 'proof_image.jpg');
        if (side === 'front') {
          onChangeFront(finalUri, name);
        } else if (onChangeBack) {
          onChangeBack(finalUri, name);
        }
      }
    } catch (e) {
      console.warn('Doc pick error', e);
      Alert.alert('Upload Error', 'Failed to upload document. Please select a valid PDF or image file.');
    } finally {
      setLoadingSide(null);
    }
  };

  const showPickOptions = (side: 'front' | 'back') => {
    if (disabled) return;
    setPickSourceSide(side);
  };

  const handleOpenPreview = (uri: string, side: 'front' | 'back') => {
    setPreviewUri(uri);
    setPreviewTitle(`${label} - ${side === 'front' ? 'Front Side' : 'Back Side'}`);
  };

  const renderSideCard = (
    side: 'front' | 'back',
    uri?: string,
    docName?: string,
    isRequired: boolean = false
  ) => {
    const isFront = side === 'front';
    const sideTitle = isFront ? 'Front Side *' : 'Back Side (Optional)';
    const isPdf = isPdfDocument(uri);
    const hasDoc = Boolean(uri && uri.trim().length > 0);

    return (
      <View style={styles.sideCard}>
        <View style={styles.sideLabelRow}>
          <Text style={[styles.sideLabel, { color: dynamicColors.textSecondary }]}>{sideTitle}</Text>
          {hasDoc && (
            <View
              style={[
                styles.typeTag,
                { backgroundColor: isPdf ? 'rgba(239, 68, 68, 0.12)' : dynamicColors.surfaceMuted },
              ]}
            >
              <Text
                style={[
                  styles.typeTagText,
                  { color: isPdf ? dynamicColors.danger : dynamicColors.ink },
                ]}
              >
                {isPdf ? 'PDF' : 'IMAGE'}
              </Text>
            </View>
          )}
        </View>

        {hasDoc ? (
          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: dynamicColors.surface,
                borderColor: dynamicColors.border,
              },
            ]}
          >
            {isPdf ? (
              /* PDF Card Display */
              <TouchableOpacity
                style={styles.pdfCardContent}
                onPress={() => handleOpenPreview(uri!, side)}
                activeOpacity={0.8}
              >
                <View style={[styles.pdfIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="document-text" size={26} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pdfName, { color: dynamicColors.ink }]} numberOfLines={1}>
                    {docName || `${label} (${side})`}
                  </Text>
                  <Text style={[styles.pdfHint, { color: dynamicColors.textSecondary }]}>
                    Tap to view / open PDF
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* Image Thumbnail Display */
              <TouchableOpacity
                style={styles.imageCardContent}
                onPress={() => handleOpenPreview(uri!, side)}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.zoomPill}>
                  <Ionicons name="eye-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.zoomText}>View</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Bottom Actions Row */}
            <View style={[styles.cardActionsRow, { borderTopColor: dynamicColors.border }]}>
              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => showPickOptions(side)}
                disabled={disabled}
              >
                <Ionicons name="camera-reverse-outline" size={14} color={dynamicColors.ink} />
                <Text style={[styles.cardActionText, { color: dynamicColors.ink }]}>Change</Text>
              </TouchableOpacity>

              <View style={[styles.actionDivider, { backgroundColor: dynamicColors.border }]} />

              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => {
                  if (isFront) onChangeFront('');
                  else if (onChangeBack) onChangeBack('');
                }}
                disabled={disabled}
              >
                <Ionicons name="trash-outline" size={14} color={dynamicColors.danger} />
                <Text style={[styles.cardActionText, { color: dynamicColors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Empty Upload Placeholder */
          <TouchableOpacity
            style={[
              styles.uploadPlaceholder,
              {
                backgroundColor: dynamicColors.surfaceMuted,
                borderColor: dynamicColors.border,
              },
            ]}
            onPress={() => showPickOptions(side)}
            activeOpacity={0.8}
            disabled={disabled}
          >
            {loadingSide === side ? (
              <ActivityIndicator color={dynamicColors.primary} />
            ) : (
              <>
                <View style={[styles.placeholderIconWrap, { backgroundColor: dynamicColors.surface }]}>
                  <Ionicons name="camera-outline" size={22} color={dynamicColors.ink} />
                </View>
                <Text style={[styles.uploadText, { color: dynamicColors.ink }]}>
                  {isFront ? 'Upload Front Proof' : 'Upload Back Proof'}
                </Text>
                <Text style={[styles.uploadSubtext, { color: dynamicColors.textTertiary }]}>
                  Camera • Gallery • PDF
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: dynamicColors.ink }]}>{label}</Text>

      <View style={styles.sidesRow}>
        {renderSideCard('front', frontUri, frontName, true)}
        {hasBackSide && renderSideCard('back', backUri, backName, false)}
      </View>

      {/* Pick Source Modal (Camera / Gallery / PDF) */}
      <Modal
        visible={pickSourceSide !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickSourceSide(null)}
      >
        <TouchableOpacity
          style={styles.sourceModalOverlay}
          activeOpacity={1}
          onPress={() => setPickSourceSide(null)}
        >
          <View
            style={[
              styles.sourceModalCard,
              { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border },
            ]}
          >
            <View style={styles.sourceModalHeader}>
              <View style={[styles.sourceIconBadge, { backgroundColor: dynamicColors.surfaceMuted }]}>
                <Ionicons name="document-attach" size={22} color={dynamicColors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sourceModalTitle, { color: dynamicColors.ink }]}>
                  Upload {label}
                </Text>
                <Text style={[styles.sourceModalSubtitle, { color: dynamicColors.textSecondary }]}>
                  {pickSourceSide === 'front' ? 'Front Side Proof' : 'Back Side Proof'} • Choose format
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickSourceSide(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={dynamicColors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.sourceOptionsList}>
              <TouchableOpacity
                style={[styles.sourceOptionBtn, { backgroundColor: dynamicColors.surfaceSubtle }]}
                onPress={() => {
                  const side = pickSourceSide;
                  setPickSourceSide(null);
                  if (side) pickImage(side, 'camera');
                }}
              >
                <View style={[styles.sourceOptionIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="camera" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceOptionTitle, { color: dynamicColors.ink }]}>
                    Capture Camera Photo
                  </Text>
                  <Text style={[styles.sourceOptionDesc, { color: dynamicColors.textSecondary }]}>
                    Snap ID card photo directly with camera
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sourceOptionBtn, { backgroundColor: dynamicColors.surfaceSubtle }]}
                onPress={() => {
                  const side = pickSourceSide;
                  setPickSourceSide(null);
                  if (side) pickImage(side, 'library');
                }}
              >
                <View style={[styles.sourceOptionIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Ionicons name="images" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceOptionTitle, { color: dynamicColors.ink }]}>
                    Choose from Gallery
                  </Text>
                  <Text style={[styles.sourceOptionDesc, { color: dynamicColors.textSecondary }]}>
                    Upload photo or scanned image from gallery
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sourceOptionBtn, { backgroundColor: dynamicColors.surfaceSubtle }]}
                onPress={() => {
                  const side = pickSourceSide;
                  setPickSourceSide(null);
                  if (side) pickDocument(side);
                }}
              >
                <View style={[styles.sourceOptionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="document-text" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceOptionTitle, { color: dynamicColors.ink }]}>
                    Upload PDF Document
                  </Text>
                  <Text style={[styles.sourceOptionDesc, { color: dynamicColors.textSecondary }]}>
                    Select digital PDF proof file (e.g. e-Aadhaar, PAN)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={dynamicColors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Document Viewer Modal */}
      <DocumentPreviewModal
        visible={Boolean(previewUri)}
        uri={previewUri || undefined}
        title={previewTitle}
        onClose={() => setPreviewUri(null)}
      />
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
    marginBottom: 8,
  },
  sidesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sideCard: {
    flex: 1,
  },
  sideLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sideLabel: {
    ...typography.caption,
    fontFamily: typography.fontBody,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  typeTagText: {
    fontFamily: typography.fontHeadline,
    fontSize: 9,
    fontWeight: '700',
  },
  uploadPlaceholder: {
    height: 120,
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 4,
  },
  placeholderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 10,
    textAlign: 'center',
  },
  previewContainer: {
    height: 120,
    borderRadius: radii.sm + 4,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  pdfCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  pdfIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfName: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
  },
  pdfHint: {
    fontSize: 10.5,
    marginTop: 2,
  },
  imageCardContent: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  zoomPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardActionsRow: {
    height: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionBtn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: '60%',
  },
  sourceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sourceModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  sourceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sourceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceModalTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '700',
  },
  sourceModalSubtitle: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    marginTop: 2,
  },
  sourceOptionsList: {
    gap: 10,
  },
  sourceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  sourceOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceOptionTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 14,
    fontWeight: '700',
  },
  sourceOptionDesc: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    marginTop: 2,
    fontSize: 11.5,
  },
});

const previewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    minHeight: 260,
    maxHeight: 460,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullImage: {
    width: 480,
    height: 360,
    maxWidth: '100%',
  },
  pdfContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  pdfIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfFileName: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  pdfDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    maxWidth: 300,
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 8,
  },
  openPdfText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
