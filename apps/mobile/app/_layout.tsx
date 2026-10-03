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
   * Desktop browsers: keep the Admin screens at a readable
   * width, centered on a neutral background.
   */
  return (
    <View style={styles.webBackground}>
      <View style={styles.webFrame}>{stack}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackground: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E9E9F1',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    backgroundColor: '#F5F5F8',
    overflow: 'hidden',
  },
});
