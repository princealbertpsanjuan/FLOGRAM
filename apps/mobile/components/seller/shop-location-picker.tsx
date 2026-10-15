import { useRef, useState } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, type LatLng } from 'react-native-maps';

import { ROLE_ACCENT } from '../ui/state-views';

/*
 * =========================================================
 * SHOP MAP PIN PICKER
 * =========================================================
 *
 * Same interaction as the customer checkout delivery pin:
 * tap the map (or drag the marker) to set the shop's exact
 * location, or use the phone's current location.
 *
 * Checkout needs florist.location {latitude, longitude} to
 * compute the delivery route and fee.
 *
 * The web build renders the react-native-maps stub; the
 * "Use my current location" button still works there.
 * =========================================================
 */

export type ShopCoordinate = { latitude: number; longitude: number };

// Naga City, Camarines Sur
export const NAGA_CITY_CENTER: ShopCoordinate = { latitude: 13.6218, longitude: 123.1948 };

const ACCENT = ROLE_ACCENT.seller;

export const isValidShopCoordinate = (
  value: { latitude?: number | null; longitude?: number | null } | null | undefined
): value is ShopCoordinate =>
  !!value &&
  typeof value.latitude === 'number' &&
  typeof value.longitude === 'number' &&
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude);

export default function ShopLocationPicker({
  value,
  onChange,
  disabled,
  error,
}: {
  value: ShopCoordinate | null;
  onChange: (next: ShopCoordinate) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const mapRef = useRef<MapView | null>(null);
  const [locating, setLocating] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const select = (coordinate: LatLng) => {
    if (disabled) return;
    setLocationError(null);
    onChange({ latitude: coordinate.latitude, longitude: coordinate.longitude });
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      setLocationError(null);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setPermissionGranted(false);
        setLocationError(
          'Location permission is required to use your current location. You can still tap the map to place your shop pin.'
        );
        return;
      }

      setPermissionGranted(true);

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinate = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      onChange(coordinate);

      mapRef.current?.animateToRegion(
        { ...coordinate, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        500
      );
    } catch (err) {
      setLocationError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to get your current location. Tap the map to place your shop pin manually.'
      );
    } finally {
      setLocating(false);
    }
  };

  const start = value ?? NAGA_CITY_CENTER;

  return (
    <View>
      <View style={styles.notice}>
        <Ionicons name="storefront-outline" size={18} color={ACCENT} />
        <Text style={styles.noticeText}>
          Pin your shop&apos;s exact location. Riders pick up orders here and FLOGRAM uses it to
          calculate delivery routes and fees.
        </Text>
      </View>

      <View style={[styles.mapCard, error ? styles.mapCardError : null]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: start.latitude,
            longitude: start.longitude,
            latitudeDelta: value ? 0.008 : 0.02,
            longitudeDelta: value ? 0.008 : 0.02,
          }}
          showsUserLocation={permissionGranted}
          showsMyLocationButton={false}
          showsCompass
          zoomEnabled
          scrollEnabled
          mapType="standard"
          onPress={event => select(event.nativeEvent.coordinate)}
        >
          {value && (
            <Marker
              coordinate={value}
              title="Shop Location"
              description="Where riders pick up orders"
              draggable={!disabled}
              pinColor={ACCENT}
              onDragEnd={event => select(event.nativeEvent.coordinate)}
            />
          )}
        </MapView>

        {!value && (
          <View pointerEvents="none" style={styles.hintOverlay}>
            <View style={styles.hintBubble}>
              <Ionicons name="location" size={16} color={ACCENT} />
              <Text style={styles.hintText}>Tap the map to place your shop pin</Text>
            </View>
          </View>
        )}
      </View>

      <Pressable
        disabled={locating || disabled}
        onPress={() => {
          void handleUseCurrentLocation();
        }}
        style={({ pressed }) => [
          styles.currentButton,
          pressed && styles.pressed,
          (locating || disabled) && styles.disabled,
        ]}
      >
        {locating ? (
          <ActivityIndicator size="small" color={ACCENT} />
        ) : (
          <Ionicons name="navigate" size={17} color={ACCENT} />
        )}
        <Text style={styles.currentButtonText}>
          {locating ? 'Finding your location...' : 'Use My Current Location'}
        </Text>
      </Pressable>

      {value ? (
        <View style={styles.selected}>
          <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedTitle}>Shop pin set</Text>
            <Text style={styles.selectedCoords}>
              {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </Text>
            <Text style={styles.selectedHint}>Drag the pin or tap the map to adjust it.</Text>
          </View>
        </View>
      ) : null}

      {locationError || error ? (
        <Text style={styles.errorText}>{locationError || error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#EAF4ED',
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#3F5A48',
    fontWeight: '600',
  },
  mapCard: {
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8E5DC',
    marginBottom: 10,
  },
  mapCardError: {
    borderColor: '#D9534F',
  },
  map: {
    flex: 1,
  },
  hintOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFFEE',
  },
  hintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3F4A44',
  },
  currentButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  currentButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  selected: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F4F8F5',
    marginBottom: 6,
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2F3A33',
  },
  selectedCoords: {
    fontSize: 12,
    color: '#55625A',
    marginTop: 2,
  },
  selectedHint: {
    fontSize: 11.5,
    color: '#7A867E',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12.5,
    color: '#D9534F',
    fontWeight: '600',
    marginTop: 2,
  },
});
