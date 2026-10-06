import { Platform, useWindowDimensions } from 'react-native';

/*
 * True when the Admin portal runs in a desktop-sized
 * browser window. Phones and narrow windows keep the
 * mobile layout (bottom navigation).
 */
export const DESKTOP_BREAKPOINT = 900;

export function useDesktopWeb() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}
