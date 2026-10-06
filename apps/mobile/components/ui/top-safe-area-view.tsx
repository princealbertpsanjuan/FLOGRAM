import type { ReactNode } from 'react';

import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * =========================================================
 * TOP-ONLY SAFE AREA (screens with a bottom navigation bar)
 * =========================================================
 *
 * React Native's SafeAreaView also pads the BOTTOM on iOS.
 * On screens that end with the bottom navigation bar that
 * lifted the bar higher than on other screens, because the
 * bar already reserves room for the home indicator itself.
 *
 * This keeps SafeAreaView's top behavior (iOS status bar /
 * notch; Android draws its own header spacing) and leaves
 * the bottom to the navigation bar, so every role's bar sits
 * at exactly the same height.
 * =========================================================
 */
export default function TopSafeAreaView({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[style, Platform.OS === 'ios' ? { paddingTop: insets.top } : null]}>
      {children}
    </View>
  );
}
