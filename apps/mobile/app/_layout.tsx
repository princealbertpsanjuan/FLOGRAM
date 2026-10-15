import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { installWebAlert } from '../utils/web-alert';

installWebAlert();

/*
 * The web build is the FLOGRAM Admin portal. Customer,
 * Seller and Rider groups redirect to login on web (see
 * their _layout files).
 */

const SIGNED_IN_GROUPS = [
  '(customer)',
  '(seller)',
  '(rider)',
  '(admin)',
] as const;

export default function RootLayout() {
  const stack = (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/*
         * Signed-in areas: the iOS edge swipe must not pop
         * the whole role group and reveal Welcome/Login
         * underneath (it looked like being logged out).
         * Screens pushed inside a group keep their swipe
         * because each group has its own Stack. Android
         * back is handled in each group's _layout.
         */}
        {SIGNED_IN_GROUPS.map(name => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              gestureEnabled: false,
            }}
          />
        ))}
      </Stack>

      <StatusBar style="auto" />
    </>
  );

  if (Platform.OS !== 'web') {
    return stack;
  }

  /*
   * Web: full browser width. The Admin layout adds the
   * desktop sidebar; login is centered on its own.
   */
  return <View style={styles.webBackground}>{stack}</View>;
}

const styles = StyleSheet.create({
  webBackground: {
    flex: 1,
    backgroundColor: '#EEEEF4',
  },
});
