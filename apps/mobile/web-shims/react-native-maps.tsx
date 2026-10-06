import { forwardRef, useImperativeHandle, type ReactNode } from 'react';

import { Platform, Text, View } from 'react-native';

/*
 * =========================================================
 * react-native-maps stub
 * =========================================================
 *
 * Used by metro.config.js for:
 * - the web build (Admin portal only; map screens are
 *   Customer/Rider mobile screens), and
 * - an Android APK built without GOOGLE_MAPS_API_KEY, which
 *   would otherwise crash when a map opens.
 *
 * Map methods called through refs are no-ops.
 * =========================================================
 */

export type LatLng = { latitude: number; longitude: number };

type AnyProps = { children?: ReactNode; style?: unknown } & Record<string, unknown>;

const noop = () => undefined;

const MapView = forwardRef<unknown, AnyProps>(function MapView({ style }, ref) {
  useImperativeHandle(ref, () => ({
    animateToRegion: noop,
    animateCamera: noop,
    fitToCoordinates: noop,
    fitToElements: noop,
    fitToSuppliedMarkers: noop,
    setCamera: noop,
  }));

  return (
    <View
      style={[
        { alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#EEF0F3' },
        style as object,
      ]}
    >
      <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
        {Platform.OS === 'web'
          ? 'Map is available in the FLOGRAM mobile app.'
          : 'Map preview is unavailable in this build. Addresses and delivery updates still work.'}
      </Text>
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
