import { Redirect, Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useRoleBackHandler } from '../../hooks/use-role-back-handler';

export default function StakeholderLayout() {
  /*
   * Android Back never leaves the Seller area (see the hook).
   * Called before the web redirect so hooks keep their order.
   */
  useRoleBackHandler('(seller)', 'seller-dashboard');

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