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

export default function RootLayout() {
  const stack = (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />

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
