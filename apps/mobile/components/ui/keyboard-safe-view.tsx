import type { ReactNode } from 'react';

import { KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';

/*
 * =========================================================
 * KEYBOARD-SAFE WRAPPER
 * =========================================================
 *
 * Android (edge-to-edge) no longer shrinks the window when
 * the keyboard opens, so every form is wrapped in a
 * KeyboardAvoidingView with "padding" on BOTH platforms.
 * Put a ScrollView inside so the focused field scrolls
 * above the keyboard.
 * =========================================================
 */

export const KEYBOARD_BEHAVIOR = Platform.OS === 'web' ? undefined : 'padding';

export default function KeyboardSafeView({
  children,
  style,
  offset = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
