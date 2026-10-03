import { Redirect, Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function CustomerLayout() {
  /*
   * Mobile-only role: the web build is the Admin portal.
   */
  if (Platform.OS === 'web') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}