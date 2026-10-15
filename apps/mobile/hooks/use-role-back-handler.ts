import { router, useNavigation, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

/*
 * =========================================================
 * ANDROID BACK BUTTON INSIDE A ROLE GROUP
 * =========================================================
 *
 * Called from (customer|seller|rider|admin)/_layout.tsx.
 *
 * Without this, pressing Back on a role's first screen
 * pops the whole group off the ROOT stack and shows the
 * Welcome/Login screen underneath, which looks like being
 * logged out. Rules:
 *
 * 1. A screen was pushed inside the group (e.g. order
 *    details) -> normal Back (pop it).
 * 2. On another tab (the bottom nav uses replace, so a
 *    tab is the group's first screen) -> go to the
 *    dashboard.
 * 3. On the dashboard -> leave the app (like any Android
 *    home screen) instead of revealing Welcome.
 *
 * Exception: when a signed-in screen (Notifications, Help
 * Center...) is below the group on the root stack, Back
 * returns to it as usual.
 *
 * Why the navigation state and not router.canGoBack():
 * canGoBack() looks at every navigator, so it is also
 * true when only the ROOT stack has history (Welcome or
 * Login still below the group). Here the layout's
 * useNavigation() is the group's own entry in the root
 * stack: getState() is the root stack state, and the
 * group's route.state is the group's inner Stack, whose
 * index tells whether a screen was pushed inside it.
 *
 * If a (shared) screen is pushed on the root stack above
 * the group, the group is not focused and Back is left to
 * the default behavior (pop that screen).
 *
 * BackHandler calls the most recently added listener
 * first. The group mounts after the navigation container,
 * so this runs before React Navigation's own handler,
 * while a screen inside the group that adds its own
 * listener (e.g. "discard changes?") still runs first.
 * =========================================================
 */

type StackState = {
  index?: number;
  routes: { name: string; state?: StackState }[];
};

// Root stack entries that Back must never reveal while signed in.
const SIGNED_OUT_ROUTES = ['index', '(auth)', '(onboarding)'];

/*
 * group:     '(customer)'
 * dashboard: 'customer-dashboard'
 */
export function useRoleBackHandler(group: string, dashboard: string) {
  const navigation = useNavigation();
  const pathname = usePathname();

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const onBackPress = () => {
      try {
        if (!navigation.isFocused()) {
          return false;
        }

        const rootState = navigation.getState() as StackState | undefined;

        const rootIndex = rootState?.index ?? 0;

        const groupRoute = rootState?.routes[rootIndex];

        const groupState = groupRoute?.state;

        // A stack state without "index" is focused on its last route.
        const groupIndex = groupState
          ? (groupState.index ?? groupState.routes.length - 1)
          : 0;

        if (groupIndex > 0) {
          return false;
        }

        /*
         * The group was pushed from a signed-in screen on the
         * root stack (e.g. Notifications or Help Center
         * pushing '/(seller)/...' adds a new group entry above
         * it): normal Back returns to that screen. Only
         * Welcome / Login / onboarding below are skipped.
         */
        const openedFromSignedInScreen = (rootState?.routes ?? [])
          .slice(0, rootIndex)
          .some(route => !SIGNED_OUT_ROUTES.includes(route.name));

        if (openedFromSignedInScreen) {
          return false;
        }

        const currentScreen =
          groupState?.routes[groupIndex]?.name ??
          // Inner state not reported yet: fall back to the URL.
          pathnameRef.current.split('/').filter(Boolean).pop();

        if (currentScreen !== dashboard) {
          router.replace(`/${group}/${dashboard}` as never);
          return true;
        }

        BackHandler.exitApp();
        return true;
      } catch {
        return false;
      }
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => subscription.remove();
  }, [navigation, group, dashboard]);
}
