import type { ReactNode } from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

/*
 * =========================================================
 * SHARED LOADING / EMPTY / ERROR STATES
 * =========================================================
 *
 * One look for every role: same spinner size, text sizes,
 * spacing and button shape. Only the accent color changes.
 * =========================================================
 */

export const ROLE_ACCENT = {
  admin: '#5552B9',
  customer: '#DF628F',
  seller: '#5E9874',
  rider: '#C49317',
} as const;

export type Role = keyof typeof ROLE_ACCENT;

const TEXT = '#3B3940';
const MUTED = '#77737B';
const BACKGROUND = '#F5F5F8';

/*
 * Full-screen loader used while a screen's first data loads.
 */
export function ScreenLoader({
  role,
  message = 'Loading...',
}: {
  role: Role;
  message?: string;
}) {
  return (
    <View style={styles.screen}>
      <ActivityIndicator
        size="large"
        color={ROLE_ACCENT[role]}
      />
      <Text style={styles.loaderText}>{message}</Text>
    </View>
  );
}

/*
 * Inline loader inside a section or list.
 */
export function InlineLoader({ role }: { role: Role }) {
  return (
    <View style={styles.inline}>
      <ActivityIndicator
        size="small"
        color={ROLE_ACCENT[role]}
      />
    </View>
  );
}

export function EmptyState({
  role,
  icon = 'file-tray-outline',
  title,
  message,
  action,
}: {
  role: Role;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: `${ROLE_ACCENT[role]}1A` }]}>
        <Ionicons
          name={icon}
          size={26}
          color={ROLE_ACCENT[role]}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? (
        <StateButton
          role={role}
          label={action.label}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}

export function ErrorState({
  role,
  message,
  onRetry,
}: {
  role: Role;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: '#FDECEF' }]}>
        <Ionicons
          name="alert-circle-outline"
          size={26}
          color="#D04A5F"
        />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <StateButton
          role={role}
          label="Try Again"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

export function StateButton({
  role,
  label,
  onPress,
  icon,
}: {
  role: Role;
  label: string;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: ROLE_ACCENT[role] },
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BACKGROUND,
  },
  loaderText: {
    marginTop: 12,
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  inline: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 12,
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
