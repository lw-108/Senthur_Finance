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

  // Responsive tab highlight pill sizing with explicit fixed dimensions
  const pillWidth = isTinyWidth ? 36 : isSmallWidth ? 40 : 44;
  const pillHeight = isTinyHeight ? 26 : 28;
  const iconSize = isTinyWidth || isTinyHeight ? 18 : isSmallWidth || isShortHeight ? 19 : 20;

  // Safe bottom inset and height calculation:
  // Dynamically balances compact screens (Android 3-button nav / small heights)
  // and heighted screens (tall aspect ratios 20:9/21:9 with gesture insets like 34-48dp)
  // so icons and labels never overlap, clip, or submerge under containers.
  const bottomInset = insets.bottom;
  const hasGestureBar = bottomInset > 0;
  const tabPaddingBottom = hasGestureBar ? bottomInset : 8;
  const contentHeight = hasGestureBar ? (isShortHeight ? 54 : 56) : (isShortHeight ? 58 : 60);
  const totalTabHeight = contentHeight + tabPaddingBottom;
  const tabPaddingTop = hasGestureBar ? (isShortHeight ? 4 : 5) : 4;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarIconStyle: {
          width: pillWidth + 4,
          height: pillHeight + 2,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
          zIndex: 15,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingHorizontal: 0,
          paddingVertical: 0,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
          zIndex: 10,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: totalTabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: tabPaddingTop,
          overflow: 'visible',
          elevation: 25,
          zIndex: 999,
          ...shadows.soft,
        },
        tabBarLabelStyle: {
          fontSize: isTinyWidth || isTinyHeight ? 9.5 : isSmallWidth || isShortHeight ? 10.5 : 11,
          fontWeight: '600',
          lineHeight: isTinyWidth || isTinyHeight ? 12 : isSmallWidth || isShortHeight ? 13 : 14,
          marginTop: 1,
          marginBottom: 0,
          letterSpacing: isSmallWidth ? -0.2 : 0,
          paddingHorizontal: 1,
          zIndex: 10,
          overflow: 'visible',
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
                { width: pillWidth, height: pillHeight },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={iconSize}
                color={focused ? colors.primaryDark : colors.textTertiary}
                style={styles.dockIcon}
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
                { width: pillWidth, height: pillHeight },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={iconSize + 1}
                color={focused ? colors.primaryDark : colors.textTertiary}
                style={styles.dockIcon}
              />
            </View>
          ),
        }}
      />

      {/* Center + Quick Add FAB Button: All-in-One Customer & Loan Disburse */}
      <Tabs.Screen
        name="quick-add"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.centerFabSlot}>
              <TouchableOpacity
                onPress={() => router.push('/loans/new' as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Create New Customer & Loan"
                style={[
                  styles.centerFab,
                  {
                    width: fabSize,
                    height: fabSize,
                    borderRadius: fabSize / 2,
                    backgroundColor: colors.primary,
                    transform: [{ translateY: fabTop }],
                    shadowColor: colors.primaryDark,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 6,
                    elevation: 10,
                    zIndex: 50,
                    borderWidth: 2,
                    borderColor: colors.surface,
                  },
                ]}
              >
                <Ionicons name="add" size={fabIconSize + 2} color="#FFFFFF" style={{ zIndex: 55 }} />
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
                { width: pillWidth, height: pillHeight },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={iconSize}
                color={focused ? colors.primaryDark : colors.textTertiary}
                style={styles.dockIcon}
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
                { width: pillWidth, height: pillHeight },
                focused && { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={iconSize}
                color={focused ? colors.primaryDark : colors.textTertiary}
                style={styles.dockIcon}
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 20,
  },
  dockIcon: {
    zIndex: 25,
  },
  centerFabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 50,
  },
  centerFab: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 10,
  },
});
