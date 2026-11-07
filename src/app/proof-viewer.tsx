import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PillButton, useToast } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { isPdfDocument, openOrShareDocument } from '@/features/customers/components/KYCDocumentPicker';

export default function ProofViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const { showSuccess } = useToast();
  const { business } = useBusinessSettingsStore();
  const bName = (business.businessName || 'FINANCE LEDGER').toUpperCase();

  const docTitle = params.title || 'Proof Document';
  const isPdf = isPdfDocument(params.url);

  const handleShare = async () => {
    if (params.url) {
      await openOrShareDocument(params.url, docTitle);
    } else {
      showSuccess('No document file attached');
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/' as any);
            }
          }}
          style={styles.closeBtn}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {docTitle}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareBtn}
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        {params.url ? (
          isPdf ? (
            <View style={styles.pdfContainer}>
              <View style={styles.pdfIconWrap}>
                <Ionicons name="document-text" size={64} color="#EF4444" />
              </View>
              <Text style={styles.pdfTitle}>{docTitle}</Text>
              <Text style={styles.pdfSubtitle}>PDF ID Proof Document</Text>
              <TouchableOpacity style={styles.openPdfBtn} onPress={handleShare}>
                <Ionicons name="open-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.openPdfBtnText}>Open / View PDF</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: params.url }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          )
        ) : (
          <View style={styles.placeholderDoc}>
            <Ionicons name="document-text" size={72} color={colors.primary} />
            <Text style={styles.docTitle}>{docTitle}</Text>
            <Text style={styles.watermark}>
              CONFIDENTIAL • FOR {bName} LOAN ONLY
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <PillButton
          title={isPdf ? 'Open / Share PDF Document' : 'Share Image Document'}
          onPress={handleShare}
          variant="secondary"
          iconName="share-social-outline"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 8,
  },
  title: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  shareBtn: {
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  pdfContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  pdfIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pdfSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  openPdfBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholderDoc: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    width: '90%',
    aspectRatio: 3 / 4,
  },
  docTitle: {
    ...typography.title,
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  watermark: {
    ...typography.caption,
    fontFamily: typography.fontPolymathThin,
    color: '#A6ACCD',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  footer: {
    padding: 16,
  },
});
