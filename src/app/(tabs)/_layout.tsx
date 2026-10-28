import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';

export default function TabsLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
          ...shadows.soft,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View
              style={
                focused
                  ? [styles.activeTabHighlight, { backgroundColor: colors.primarySoft }]
                  : styles.inactiveTabWrap
              }
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
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
              style={
                focused
                  ? [styles.activeTabHighlight, { backgroundColor: colors.primarySoft }]
                  : styles.inactiveTabWrap
              }
            >
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={21}
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
            <TouchableOpacity
              onPress={() => router.push('/loans/new' as any)}
              activeOpacity={0.85}
              style={styles.centerFabContainer}
            >
              <View style={[styles.centerFab, shadows.floating, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => (
            <View
              style={
                focused
                  ? [styles.activeTabHighlight, { backgroundColor: colors.primarySoft }]
                  : styles.inactiveTabWrap
              }
            >
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={20}
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
              style={
                focused
                  ? [styles.activeTabHighlight, { backgroundColor: colors.primarySoft }]
                  : styles.inactiveTabWrap
              }
            >
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={20}
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
  activeTabHighlight: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabWrap: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFabContainer: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
