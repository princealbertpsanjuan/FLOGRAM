import { forwardRef, type ReactNode } from 'react';

import { Text, View } from 'react-native';

/*
 * =========================================================
 * react-native-maps stub for the web build
 * =========================================================
 *
 * The web build of FLOGRAM is the Admin portal only. Map
 * screens belong to Customers and Riders (mobile app), but
 * Expo Router bundles every route, so this stub keeps the
 * web bundle building. metro.config.js points
 * "react-native-maps" here when platform === "web".
 * =========================================================
 */

export type LatLng = { latitude: number; longitude: number };

type AnyProps = { children?: ReactNode; style?: unknown } & Record<string, unknown>;

const MapView = forwardRef<View, AnyProps>(function MapView({ style }, ref) {
  return (
    <View
      ref={ref}
      style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF0F3' }, style as object]}
    >
      <Text style={{ color: '#6B7280', fontSize: 13 }}>Map is available in the FLOGRAM mobile app.</Text>
    </View>
  );
});

export const Marker = (_props: AnyProps) => null;
export const Polyline = (_props: AnyProps) => null;
export const Circle = (_props: AnyProps) => null;
export const Callout = (_props: AnyProps) => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

export default MapView;
