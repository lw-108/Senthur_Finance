import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Handle small & short mobile viewports (e.g., iPhone SE, compact Android screens with 3-button nav)
  const isTinyWidth = width > 0 && width < 340;
  const isSmallWidth = width > 0 && width < 380;
  const isShortHeight = height > 0 && height < 740;
  const isTinyHeight = height > 0 && height < 660;

  // Responsive center FAB dimensions
  const fabSize = isTinyWidth || isTinyHeight ? 42 : isSmallWidth || isShortHeight ? 46 : 52;
  const fabIconSize = isTinyWidth || isTinyHeight ? 22 : isSmallWidth || isShortHeight ? 24 : 28;
  const fabTop = isTinyWidth || isTinyHeight ? -10 : isSmallWidth || isShortHeight ? -14 : -18;

  // Responsive tab highlight pill sizing
  const pillPaddingH = isTinyWidth ? 4 : isSmallWidth ? 6 : 8;
  const pillPaddingV = isShortHeight ? 1 : 2;
  const iconSize = isTinyWidth || isShortHeight ? 18 : isSmallWidth ? 19 : 20;

  // Safe bottom inset and height calculation:
  // Guarantees ample vertical headroom so tab labels are never clipped or hidden in half.
  const bottomInset = insets.bottom;
  const contentHeight = isShortHeight ? 56 : 60;
  const tabPaddingBottom = bottomInset > 0 ? bottomInset : (Platform.OS === 'ios' ? 10 : 6);
  const totalTabHeight = contentHeight + tabPaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 0,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: totalTabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: 4,
          overflow: 'visible',
          elevation: 25,
          zIndex: 999,
          ...shadows.soft,
        },
        tabBarLabelStyle: {
          fontSize: isTinyWidth || isShortHeight ? 10 : isSmallWidth ? 10.5 : 11,
          fontWeight: '600',
          lineHeight: isTinyWidth || isShortHeight ? 13 : isSmallWidth ? 14 : 15,
          marginTop: 1,
          marginBottom: 1,
          letterSpacing: isSmallWidth ? -0.2 : 0,
          paddingHorizontal: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.tabPill,
                { paddingHorizontal: pillPaddingH, paddingVertical: pillPaddingV },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={iconSize}
                color={focused ? colors.primaryDark : colors.textTertiary}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.tabPill,
                { paddingHorizontal: pillPaddingH, paddingVertical: pillPaddingV },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={iconSize + 1}
                color={focused ? colors.primaryDark : colors.textTertiary}
              />
            </View>
          ),
        }}
      />

      {/* Center + Quick Add FAB Button */}
      <Tabs.Screen
        name="quick-add"
        options={{
          title: '',
          tabBarButton: (props) => (
            <View style={styles.centerFabSlot}>
              <TouchableOpacity
                onPress={() => router.push('/loans/new' as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Create New Loan"
                style={[
                  styles.centerFab,
                  {
                    width: fabSize,
                    height: fabSize,
                    borderRadius: fabSize / 2,
                    backgroundColor: colors.primary,
                    transform: [{ translateY: fabTop }],
                  },
                ]}
              >
                <Ionicons name="add" size={fabIconSize} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.tabPill,
                { paddingHorizontal: pillPaddingH, paddingVertical: pillPaddingV },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={iconSize}
                color={focused ? colors.primaryDark : colors.textTertiary}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.tabPill,
                { paddingHorizontal: pillPaddingH, paddingVertical: pillPaddingV },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={iconSize}
                color={focused ? colors.primaryDark : colors.textTertiary}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabPill: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  centerFab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
