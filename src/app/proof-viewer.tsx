import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PillButton, useToast } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';

export default function ProofViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const { showSuccess } = useToast();
  const { business } = useBusinessSettingsStore();
  const bName = (business.businessName || 'FINANCE LEDGER').toUpperCase();

  const docTitle = params.title || 'Proof Document';

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{docTitle}</Text>
        <TouchableOpacity
          onPress={() => showSuccess('Document ready for sharing')}
          style={styles.shareBtn}
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        {params.url ? (
          <Image
            source={{ uri: params.url }}
            style={styles.documentImage}
            resizeMode="contain"
          />
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
          title="Share Document"
          onPress={() => showSuccess('Shared via system sheet')}
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
  placeholderDoc: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.darkCard,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  docTitle: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: 1.0,
  },
  watermark: {
    fontFamily: typography.fontBody,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  footer: {
    paddingBottom: 20,
  },
});
