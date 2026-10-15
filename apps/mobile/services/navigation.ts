import { router } from 'expo-router';
import { Platform } from 'react-native';

/*
 * =========================================================
 * ENTER A SIGNED-IN AREA
 * =========================================================
 *
 * router.replace() alone only swaps the current screen:
 * Welcome / Login stay underneath in the root stack, so
 * the Android back button or the iOS swipe would "log the
 * user out" visually. Dismissing the history first leaves
 * the role group as the only screen.
 *
 * Web (Admin portal) keeps the browser history as is.
 * =========================================================
 */
export const replaceHistory = (
  route: string
) => {
  if (
    Platform.OS !== 'web' &&
    router.canDismiss()
  ) {
    router.dismissAll();
  }

  router.replace(route as never);
};
