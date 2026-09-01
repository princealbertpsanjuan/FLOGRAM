import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MapView, {
  Marker,
  Polyline,
  type LatLng,
} from 'react-native-maps';

import {
  completeDelivery,
  getDeliveryTracking,
  getRiderNavigation,
  pickupDelivery,
  startDelivery,
  updateRiderLocation,
  uploadProofOfDelivery,
  type Delivery,
  type RiderNavigationResponse,
} from '../../services/delivery';

/*
 * =========================================================
 * RIDER ACTIVE DELIVERY
 * =========================================================
 *
 * accepted
 *   Rider -> Florist
 *
 * picked_up
 *   Rider -> Customer
 *
 * out_for_delivery
 *   Rider -> Customer
 *   Proof of Delivery required
 *
 * delivered
 *   Delivery completed
 * =========================================================
 */

export default function RiderDeliveryScreen() {
  const params =
    useLocalSearchParams<{
      deliveryId?: string;
    }>();

  const deliveryId =
    typeof params.deliveryId === 'string'
      ? params.deliveryId
      : '';

  /*
   * =========================================================
   * DELIVERY STATE
   * =========================================================
   */

  const [delivery, setDelivery] =
    useState<Delivery | null>(null);

  const [navigation, setNavigation] =
    useState<RiderNavigationResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  /*
   * =========================================================
   * PROOF OF DELIVERY
   * =========================================================
   */

  const [
    proofPhoto,
    setProofPhoto,
  ] =
    useState<ImagePicker.ImagePickerAsset | null>(
      null
    );

  const [
    proofUploading,
    setProofUploading,
  ] =
    useState(false);

  /*
   * IMPORTANT:
   *
   * This is intentionally based on
   * backend delivery data.
   *
   * Selecting/taking a local photo alone
   * does NOT unlock delivery completion.
   */
  const hasUploadedProof =
    Boolean(
      delivery?.proofOfDelivery?.imageUrl &&
        delivery?.proofOfDelivery
          ?.uploadedAt
    );

  /*
   * =========================================================
   * LOCATION STATE
   * =========================================================
   */

  const [
    locationPermissionGranted,
    setLocationPermissionGranted,
  ] = useState(false);

  const [
    locationError,
    setLocationError,
  ] = useState<string | null>(null);

  const [
    lastGpsUpdate,
    setLastGpsUpdate,
  ] = useState<Date | null>(null);

  const [
    riderCoordinate,
    setRiderCoordinate,
  ] = useState<LatLng | null>(null);

  /*
   * =========================================================
   * REFS
   * =========================================================
   */

  const mapRef =
    useRef<MapView | null>(null);

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(
      null
    );

  const trackingInterval =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const sendingLocation =
    useRef(false);

  const startingLocationTracking =
    useRef(false);

  const deliveryStatusRef =
  useRef<Delivery['status'] | null>(
    null
  );

  useEffect(() => {
  deliveryStatusRef.current =
    delivery?.status ?? null;
}, [delivery?.status]);


  /*
   * =========================================================
   * LOAD TRACKING
   * =========================================================
   */

  const loadTracking =
    useCallback(async () => {
      if (!deliveryId) {
        return;
      }

      try {
        const tracking =
          await getDeliveryTracking(
            deliveryId
          );

        setDelivery(tracking);

        const backendLatitude =
          tracking?.riderLocation
            ?.latitude;

        const backendLongitude =
          tracking?.riderLocation
            ?.longitude;

        if (
          typeof backendLatitude ===
            'number' &&
          typeof backendLongitude ===
            'number'
        ) {
          setRiderCoordinate({
            latitude:
              backendLatitude,

            longitude:
              backendLongitude,
          });
        }
      } catch (error) {
        console.error(
          'Unable to load delivery tracking:',
          error
        );
      }
    }, [deliveryId]);

  /*
   * =========================================================
   * LOAD NAVIGATION
   * =========================================================
   */

  const loadNavigation =
    useCallback(async () => {
      if (!deliveryId) {
        return;
      }

      try {
        const currentNavigation =
          await getRiderNavigation(
            deliveryId
          );

        setNavigation(
          currentNavigation
        );
      } catch (error) {
        console.error(
          'Unable to load rider navigation:',
          error
        );
      }
    }, [deliveryId]);

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    const initialize =
      async () => {
        if (!deliveryId) {
          setLoading(false);

          Alert.alert(
            'Delivery Error',
            'No delivery ID was provided.',
            [
              {
                text: 'Back',

                onPress: () =>
                  router.back(),
              },
            ]
          );

          return;
        }

        try {
          setLoading(true);

          await loadTracking();
        } finally {
          setLoading(false);
        }
      };

    initialize();
  }, [
    deliveryId,
    loadTracking,
  ]);

  /*
   * =========================================================
   * TRACKING REFRESH
   * =========================================================
   */

  useEffect(() => {
    if (!deliveryId) {
      return;
    }

    trackingInterval.current =
      setInterval(() => {
        loadTracking();
      }, 8000);

    return () => {
      if (
        trackingInterval.current
      ) {
        clearInterval(
          trackingInterval.current
        );

        trackingInterval.current =
          null;
      }
    };
  }, [
    deliveryId,
    loadTracking,
  ]);

  /*
   * =========================================================
   * SEND GPS TO BACKEND
   * =========================================================
   */

const sendLocationToBackend =
  useCallback(
    async (
      location:
        Location.LocationObject
    ) => {
      const currentStatus =
        deliveryStatusRef.current;

      const isActiveDelivery =
        currentStatus === 'accepted' ||
        currentStatus === 'picked_up' ||
        currentStatus ===
          'out_for_delivery';

      /*
       * Never send GPS updates after
       * the delivery stops being active.
       *
       * This also protects against a
       * Location.watchPositionAsync()
       * callback that was already queued
       * when the delivery was completed.
       */
      if (
        !deliveryId ||
        !isActiveDelivery ||
        sendingLocation.current
      ) {
        return;
      }

      try {
        sendingLocation.current =
          true;

        /*
         * Check again after acquiring the
         * sending lock in case the status
         * changed at almost the same time.
         */
        const latestStatus =
          deliveryStatusRef.current;

        const stillActive =
          latestStatus === 'accepted' ||
          latestStatus ===
            'picked_up' ||
          latestStatus ===
            'out_for_delivery';

        if (!stillActive) {
          return;
        }

        const currentCoordinate = {
          latitude:
            location.coords.latitude,

          longitude:
            location.coords.longitude,
        };

        setRiderCoordinate(
          currentCoordinate
        );

        await updateRiderLocation(
          deliveryId,
          {
            latitude:
              currentCoordinate.latitude,

            longitude:
              currentCoordinate.longitude,

            accuracy:
              location.coords.accuracy,
          }
        );

        /*
         * The delivery may have been
         * completed while the network
         * request was running.
         *
         * If so, don't continue requesting
         * navigation/tracking for the
         * completed delivery.
         */
        const statusAfterUpdate =
          deliveryStatusRef.current;

        const remainsActive =
          statusAfterUpdate ===
            'accepted' ||
          statusAfterUpdate ===
            'picked_up' ||
          statusAfterUpdate ===
            'out_for_delivery';

        if (!remainsActive) {
          return;
        }

        setLastGpsUpdate(
          new Date()
        );

        setLocationError(null);

        await loadNavigation();

        /*
         * Check one more time before
         * refreshing tracking.
         */
        const statusBeforeTracking =
          deliveryStatusRef.current;

        const canRefreshTracking =
          statusBeforeTracking ===
            'accepted' ||
          statusBeforeTracking ===
            'picked_up' ||
          statusBeforeTracking ===
            'out_for_delivery';

        if (canRefreshTracking) {
          await loadTracking();
        }
      } catch (error) {
        /*
         * If the delivery became completed
         * while a GPS request was already
         * in flight, do not show/log that
         * expected race-condition error.
         */
        const latestStatus =
          deliveryStatusRef.current;

        const stillActive =
          latestStatus === 'accepted' ||
          latestStatus ===
            'picked_up' ||
          latestStatus ===
            'out_for_delivery';

        if (!stillActive) {
          return;
        }

        console.error(
          'GPS update failed:',
          error
        );

        setLocationError(
          error instanceof Error
            ? error.message
            : 'Unable to update rider location.'
        );
      } finally {
        sendingLocation.current =
          false;
      }
    },
    [
      deliveryId,
      loadNavigation,
      loadTracking,
    ]
  );

  /*
   * =========================================================
   * START LIVE GPS
   * =========================================================
   */

  const startLocationTracking =
    useCallback(async () => {
      if (
        !deliveryId ||
        startingLocationTracking.current
      ) {
        return;
      }

      try {
        startingLocationTracking.current =
          true;

        if (
          locationSubscription.current
        ) {
          locationSubscription.current.remove();

          locationSubscription.current =
            null;
        }

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !==
          'granted'
        ) {
          setLocationPermissionGranted(
            false
          );

          setLocationError(
            'Location permission is required for rider navigation.'
          );

          return;
        }

        setLocationPermissionGranted(
          true
        );

        setLocationError(null);

        const currentLocation =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          );

        await sendLocationToBackend(
          currentLocation
        );

        locationSubscription.current =
          await Location.watchPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,

              timeInterval:
                5000,

              distanceInterval:
                10,
            },

            async (
              location
            ) => {
              await sendLocationToBackend(
                location
              );
            }
          );
      } catch (error) {
        console.error(
          'Unable to start location tracking:',
          error
        );

        setLocationError(
          error instanceof Error
            ? error.message
            : 'Unable to start GPS tracking.'
        );
      } finally {
        startingLocationTracking.current =
          false;
      }
    }, [
      deliveryId,
      sendLocationToBackend,
    ]);

  /*
   * =========================================================
   * GPS LIFECYCLE
   * =========================================================
   */

  useEffect(() => {
    const activeStatus =
      delivery?.status ===
        'accepted' ||
      delivery?.status ===
        'picked_up' ||
      delivery?.status ===
        'out_for_delivery';

    if (activeStatus) {
      startLocationTracking();
    } else {
      if (
        locationSubscription.current
      ) {
        locationSubscription.current.remove();

        locationSubscription.current =
          null;
      }
    }

    return () => {
      if (
        locationSubscription.current
      ) {
        locationSubscription.current.remove();

        locationSubscription.current =
          null;
      }
    };
  }, [
    delivery?.status,
    startLocationTracking,
  ]);

  /*
   * =========================================================
   * MAP ROUTE COORDINATES
   * =========================================================
   */

  const routeCoordinates =
    useMemo<LatLng[]>(() => {
      const coordinates =
        navigation?.geometry
          ?.coordinates;

      if (
        !coordinates ||
        !Array.isArray(
          coordinates
        )
      ) {
        return [];
      }

      return coordinates
        .map((coordinate) => {
          if (
            !Array.isArray(
              coordinate
            ) ||
            coordinate.length < 2
          ) {
            return null;
          }

          const longitude =
            Number(coordinate[0]);

          const latitude =
            Number(coordinate[1]);

          if (
            !Number.isFinite(
              latitude
            ) ||
            !Number.isFinite(
              longitude
            )
          ) {
            return null;
          }

          return {
            latitude,
            longitude,
          };
        })
        .filter(
          (
            coordinate
          ): coordinate is LatLng =>
            coordinate !== null
        );
    }, [
      navigation?.geometry
        ?.coordinates,
    ]);

  /*
   * =========================================================
   * CURRENT DESTINATION
   * =========================================================
   *
   * delivery.status is the
   * source of truth.
   *
   * accepted
   *   -> florist
   *
   * picked_up
   *   -> customer
   *
   * out_for_delivery
   *   -> customer
   * =========================================================
   */

  const shouldShowPickup =
    delivery?.status ===
    'accepted';

  const destinationCoordinate =
    useMemo<LatLng | null>(() => {
      if (!delivery) {
        return null;
      }

      const location =
        shouldShowPickup
          ? delivery.pickupLocation
          : delivery.deliveryLocation;

      if (
        typeof location?.latitude !==
          'number' ||
        typeof location?.longitude !==
          'number'
      ) {
        return null;
      }

      return {
        latitude:
          location.latitude,

        longitude:
          location.longitude,
      };
    }, [
      delivery,
      shouldShowPickup,
    ]);

  /*
   * =========================================================
   * FIT MAP TO ROUTE
   * =========================================================
   */

  const fitMapToRoute =
    useCallback(() => {
      if (!mapRef.current) {
        return;
      }

      const coordinates: LatLng[] =
        [];

      if (riderCoordinate) {
        coordinates.push(
          riderCoordinate
        );
      }

      if (
        routeCoordinates.length >
        0
      ) {
        coordinates.push(
          ...routeCoordinates
        );
      }

      if (
        destinationCoordinate
      ) {
        coordinates.push(
          destinationCoordinate
        );
      }

      if (
        coordinates.length >= 2
      ) {
        mapRef.current.fitToCoordinates(
          coordinates,
          {
            edgePadding: {
              top: 70,
              right: 50,
              bottom: 70,
              left: 50,
            },

            animated: true,
          }
        );

        return;
      }

      if (riderCoordinate) {
        mapRef.current.animateToRegion(
          {
            latitude:
              riderCoordinate.latitude,

            longitude:
              riderCoordinate.longitude,

            latitudeDelta:
              0.012,

            longitudeDelta:
              0.012,
          },

          500
        );
      }
    }, [
      destinationCoordinate,
      riderCoordinate,
      routeCoordinates,
    ]);

  useEffect(() => {
    if (
      routeCoordinates.length >
      0
    ) {
      const timeout =
        setTimeout(() => {
          fitMapToRoute();
        }, 300);

      return () => {
        clearTimeout(timeout);
      };
    }

    return undefined;
  }, [
    routeCoordinates,
    fitMapToRoute,
  ]);

  /*
   * =========================================================
   * PICKUP
   * =========================================================
   */

  const handlePickup =
    async () => {
      if (!delivery) {
        return;
      }

      Alert.alert(
        'Confirm Pickup',
        'Have you received the bouquet from the florist?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

          {
            text: 'Confirm',

            onPress:
              async () => {
                try {
                  setActionLoading(
                    true
                  );

                  const updated =
                    await pickupDelivery(
                      delivery._id,
                      'Bouquet picked up from florist.'
                    );

                  setDelivery(
                    updated
                  );

                  /*
                   * Remove florist route first
                   * before loading customer route.
                   */
                  setNavigation(null);

                  await loadNavigation();

                  await loadTracking();
                } catch (error) {
                  Alert.alert(
                    'Pickup Failed',
                    error instanceof
                    Error
                      ? error.message
                      : 'Unable to mark bouquet as picked up.'
                  );
                } finally {
                  setActionLoading(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  /*
   * =========================================================
   * START DELIVERY
   * =========================================================
   */

  const handleStartDelivery =
    async () => {
      if (!delivery) {
        return;
      }

      Alert.alert(
        'Start Delivery',
        'Start travelling to the customer?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

          {
            text: 'Start',

            onPress:
              async () => {
                try {
                  setActionLoading(
                    true
                  );

                  const updated =
                    await startDelivery(
                      delivery._id,
                      'Leaving the florist and heading to the customer.'
                    );

                  setDelivery(
                    updated
                  );

                  setNavigation(null);

                  await loadNavigation();

                  await loadTracking();
                } catch (error) {
                  Alert.alert(
                    'Unable to Start',
                    error instanceof
                    Error
                      ? error.message
                      : 'Unable to start delivery.'
                  );
                } finally {
                  setActionLoading(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  /*
   * =========================================================
   * TAKE PROOF PHOTO
   * =========================================================
   */

  const handleTakeProofPhoto =
    async () => {
      if (!delivery) {
        return;
      }

      if (
        delivery.status !==
        'out_for_delivery'
      ) {
        Alert.alert(
          'Proof Unavailable',
          'Proof of delivery can only be captured while the order is out for delivery.'
        );

        return;
      }

      try {
        const cameraPermission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (
          cameraPermission.status !==
          'granted'
        ) {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission is required to take a proof of delivery photo.'
          );

          return;
        }

        const result =
          await ImagePicker.launchCameraAsync(
            {
              mediaTypes:
                ['images'],

              allowsEditing:
                false,

              quality:
                0.8,
            }
          );

        if (result.canceled) {
          return;
        }

        const asset =
          result.assets?.[0];

        if (!asset?.uri) {
          Alert.alert(
            'Photo Error',
            'The proof photo could not be read.'
          );

          return;
        }

        setProofPhoto(asset);
      } catch (error) {
        console.error(
          'Unable to take proof photo:',
          error
        );

        Alert.alert(
          'Camera Error',
          error instanceof Error
            ? error.message
            : 'Unable to take a proof of delivery photo.'
        );
      }
    };

  /*
   * =========================================================
   * REMOVE / RETAKE LOCAL PROOF
   * =========================================================
   */

  const handleRetakeProofPhoto =
    async () => {
      if (proofUploading) {
        return;
      }

      setProofPhoto(null);

      await handleTakeProofPhoto();
    };

  /*
   * =========================================================
   * UPLOAD PROOF
   * =========================================================
   */

  const handleUploadProof =
    async () => {
      if (
        !delivery ||
        !proofPhoto
      ) {
        Alert.alert(
          'Proof Required',
          'Take a proof of delivery photo first.'
        );

        return;
      }

      if (
        delivery.status !==
        'out_for_delivery'
      ) {
        Alert.alert(
          'Upload Unavailable',
          'Proof can only be uploaded while the order is out for delivery.'
        );

        return;
      }

      try {
        setProofUploading(true);

        /*
         * Prefer a fresh device location for
         * the POD record.
         *
         * If unavailable, use the current
         * tracked rider coordinate.
         */
        let latitude:
          number | null =
          riderCoordinate?.latitude ??
          null;

        let longitude:
          number | null =
          riderCoordinate?.longitude ??
          null;

        let accuracy:
          number | null =
          null;

        try {
          const permission =
            await Location.getForegroundPermissionsAsync();

          if (
            permission.status ===
            'granted'
          ) {
            const currentLocation =
              await Location.getCurrentPositionAsync(
                {
                  accuracy:
                    Location.Accuracy.High,
                }
              );

            latitude =
              currentLocation.coords
                .latitude;

            longitude =
              currentLocation.coords
                .longitude;

            accuracy =
              currentLocation.coords
                .accuracy;
          }
        } catch (locationFailure) {
          console.warn(
            'Fresh POD location unavailable. Falling back to tracked rider location.',
            locationFailure
          );
        }

        const updated =
          await uploadProofOfDelivery(
            delivery._id,
            {
              image: {
                uri:
                  proofPhoto.uri,

                name:
                  proofPhoto.fileName ??
                  `delivery-proof-${delivery._id}-${Date.now()}.jpg`,

                type:
                  proofPhoto.mimeType ??
                  'image/jpeg',
              },

              latitude,

              longitude,

              accuracy,
            }
          );

        /*
         * Do not assume success solely because
         * the request did not throw.
         *
         * Confirm the backend returned the POD.
         */
        const backendConfirmedProof =
          Boolean(
            updated.proofOfDelivery
              ?.imageUrl &&
              updated.proofOfDelivery
                ?.uploadedAt
          );

        if (!backendConfirmedProof) {
          throw new Error(
            'The server did not confirm the proof of delivery upload.'
          );
        }

        setDelivery(updated);

        setProofPhoto(null);

        /*
         * Re-fetch the server copy as another
         * confirmation and to keep the screen
         * synchronized with backend state.
         */
        await loadTracking();

        Alert.alert(
          'Proof Uploaded',
          'Proof of delivery was uploaded successfully. You can now mark the order as delivered.'
        );
      } catch (error) {
        console.error(
          'Proof upload failed:',
          error
        );

        Alert.alert(
          'Upload Failed',
          error instanceof Error
            ? error.message
            : 'Unable to upload proof of delivery.'
        );
      } finally {
        setProofUploading(false);
      }
    };

  /*
   * =========================================================
   * COMPLETE DELIVERY
   * =========================================================
   */

  const handleDelivered =
    async () => {
      if (!delivery) {
        return;
      }

      /*
       * FRONTEND PROTECTION
       *
       * The backend independently performs
       * the same requirement.
       */
      if (!hasUploadedProof) {
        Alert.alert(
          'Proof of Delivery Required',
          'Upload a proof of delivery photo before marking this delivery as completed.'
        );

        return;
      }

      Alert.alert(
        'Complete Delivery',
        `Confirm that the bouquet was delivered to ${delivery.recipientName}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

          {
            text: 'Delivered',

            onPress:
              async () => {
                try {
                  setActionLoading(
                    true
                  );

const updated =
  await completeDelivery(
    delivery._id,
    `Bouquet delivered successfully to ${delivery.recipientName}.`
  );

/*
 * Immediately prevent any queued GPS
 * callback from sending another update.
 */
deliveryStatusRef.current =
  updated.status;

/*
 * Stop the live GPS subscription before
 * performing any more screen work.
 */
if (
  locationSubscription.current
) {
  locationSubscription.current.remove();

  locationSubscription.current =
    null;
}

setDelivery(updated);

setNavigation(null);

setLocationError(null);

                  Alert.alert(
                    'Delivery Completed',
                    'The delivery was completed successfully.',
                    [
                      {
                        text:
                          'Return to Dashboard',

                        onPress:
                          () => {
                            router.replace(
                              '/rider-dashboard'
                            );
                          },
                      },
                    ]
                  );
                } catch (error) {
                  Alert.alert(
                    'Completion Failed',
                    error instanceof
                    Error
                      ? error.message
                      : 'Unable to complete delivery.'
                  );
                } finally {
                  setActionLoading(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  /*
   * =========================================================
   * FORMATTERS
   * =========================================================
   */

  const formatAddress = (
    address?: {
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      landmark?: string;
    }
  ) => {
    if (!address) {
      return 'Address unavailable';
    }

    return [
      address.street,
      address.barangay,
      address.city,
      address.province,
    ]
      .filter(Boolean)
      .join(', ');
  };

  const formatDistance = (
    meters:
      number | null | undefined
  ) => {
    if (
      meters === null ||
      meters === undefined
    ) {
      return '--';
    }

    if (meters < 1000) {
      return `${Math.round(
        meters
      )} m`;
    }

    return `${(
      meters / 1000
    ).toFixed(1)} km`;
  };

  const formatDuration = (
    seconds:
      number | null | undefined
  ) => {
    if (
      seconds === null ||
      seconds === undefined
    ) {
      return '--';
    }

    const minutes =
      Math.ceil(
        seconds / 60
      );

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    const remaining =
      minutes % 60;

    return `${hours}h ${remaining}m`;
  };

  const formatETA = (
    value:
      string | null | undefined
  ) => {
    if (!value) {
      return '--';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '--';
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#C99730"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading delivery...
        </Text>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Delivery unavailable
        </Text>

        <Pressable
          style={
            styles.returnButton
          }
          onPress={() =>
            router.replace(
              '/rider-dashboard'
            )
          }
        >
          <Text
            style={
              styles.returnButtonText
            }
          >
            Return to Dashboard
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * DISPLAY DESTINATION
   * =========================================================
   */

  const destinationTitle =
    shouldShowPickup
      ? 'Florist Pickup'
      : 'Customer Delivery';

  const destinationAddress =
    shouldShowPickup
      ? formatAddress(
          delivery.pickupAddress
        )
      : formatAddress(
          delivery.deliveryAddress
        );

  const currentNavigation =
    navigation?.navigation;

  const initialMapCoordinate: LatLng =
    riderCoordinate ??
    destinationCoordinate ??
    {
      latitude:
        delivery.pickupLocation
          ?.latitude ??
        13.6218,

      longitude:
        delivery.pickupLocation
          ?.longitude ??
        123.1948,
    };

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <View
        style={
          styles.screen
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerTop
            }
          >
            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.backButtonText
                }
              >
                ←
              </Text>
            </Pressable>

            <View
              style={
                styles.headerTitleArea
              }
            >
              <Text
                style={
                  styles.headerLabel
                }
              >
                ACTIVE DELIVERY
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                {destinationTitle}
              </Text>
            </View>

            <View
              style={
                styles.liveBadge
              }
            >
              <View
                style={
                  styles.liveDot
                }
              />

              <Text
                style={
                  styles.liveText
                }
              >
                LIVE
              </Text>
            </View>
          </View>

          <View
            style={
              styles.statusPill
            }
          >
            <Text
              style={
                styles.statusText
              }
            >
              {delivery.status
                .replaceAll(
                  '_',
                  ' '
                )
                .toUpperCase()}
            </Text>
          </View>
        </View>

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* GPS */}

          <View
            style={
              styles.gpsCard
            }
          >
            <View
              style={
                styles.gpsIcon
              }
            >
              <Text
                style={
                  styles.gpsIconText
                }
              >
                📍
              </Text>
            </View>

            <View
              style={
                styles.gpsInfo
              }
            >
              <Text
                style={
                  styles.gpsTitle
                }
              >
                GPS Tracking
              </Text>

              <Text
                style={[
                  styles.gpsStatus,

                  locationPermissionGranted
                    ? styles.gpsOnline
                    : styles.gpsOffline,
                ]}
              >
                {locationPermissionGranted
                  ? '● Live location active'
                  : '● Location permission required'}
              </Text>

              {lastGpsUpdate && (
                <Text
                  style={
                    styles.gpsUpdated
                  }
                >
                  Last update:{' '}
                  {lastGpsUpdate.toLocaleTimeString()}
                </Text>
              )}
            </View>

            {!locationPermissionGranted && (
              <Pressable
                style={
                  styles.enableGpsButton
                }
                onPress={
                  startLocationTracking
                }
              >
                <Text
                  style={
                    styles.enableGpsText
                  }
                >
                  Enable
                </Text>
              </Pressable>
            )}
          </View>

          {locationError && (
            <View
              style={
                styles.errorCard
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {locationError}
              </Text>
            </View>
          )}

          {/* LIVE MAP */}

          <View
            style={
              styles.mapCard
            }
          >
            <View
              style={
                styles.mapHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.mapLabel
                  }
                >
                  LIVE NAVIGATION
                </Text>

                <Text
                  style={
                    styles.mapTitle
                  }
                >
                  {destinationTitle}
                </Text>
              </View>

              <View
                style={
                  styles.mapLiveBadge
                }
              >
                <View
                  style={
                    styles.mapLiveDot
                  }
                />

                <Text
                  style={
                    styles.mapLiveText
                  }
                >
                  GPS
                </Text>
              </View>
            </View>

            <View
              style={
                styles.mapContainer
              }
            >
              <MapView
                ref={
                  mapRef
                }
                style={
                  styles.map
                }
                initialRegion={{
                  latitude:
                    initialMapCoordinate.latitude,

                  longitude:
                    initialMapCoordinate.longitude,

                  latitudeDelta:
                    0.015,

                  longitudeDelta:
                    0.015,
                }}
                showsUserLocation={
                  locationPermissionGranted
                }
                showsMyLocationButton={
                  false
                }
                showsCompass
                rotateEnabled
                pitchEnabled
                zoomEnabled
                scrollEnabled
                mapType="standard"
                onMapReady={() => {
                  setTimeout(() => {
                    fitMapToRoute();
                  }, 300);
                }}
              >
                {/* ROUTE */}

                {routeCoordinates.length >
                  1 && (
                  <Polyline
                    coordinates={
                      routeCoordinates
                    }
                    strokeWidth={
                      5
                    }
                    strokeColor="#C99730"
                    lineCap="round"
                    lineJoin="round"
                  />
                )}

                {/* RIDER */}

                {riderCoordinate && (
                  <Marker
                    coordinate={
                      riderCoordinate
                    }
                    title="Your Location"
                    description="FLOGRAM Rider"
                    anchor={{
                      x: 0.5,
                      y: 0.5,
                    }}
                  >
                    <View
                      style={
                        styles.riderMarkerOuter
                      }
                    >
                      <View
                        style={
                          styles.riderMarker
                        }
                      >
                        <Text
                          style={
                            styles.riderMarkerText
                          }
                        >
                          🛵
                        </Text>
                      </View>
                    </View>
                  </Marker>
                )}

                {/* CURRENT DESTINATION */}

                {shouldShowPickup ? (
                  delivery.pickupLocation &&
                  typeof delivery
                    .pickupLocation
                    .latitude ===
                    'number' &&
                  typeof delivery
                    .pickupLocation
                    .longitude ===
                    'number' ? (
                    <Marker
                      coordinate={{
                        latitude:
                          delivery
                            .pickupLocation
                            .latitude,

                        longitude:
                          delivery
                            .pickupLocation
                            .longitude,
                      }}
                      title="Florist Pickup"
                      description={
                        formatAddress(
                          delivery.pickupAddress
                        )
                      }
                    >
                      <View
                        style={[
                          styles.destinationMarker,
                          styles.activeDestinationMarker,
                        ]}
                      >
                        <Text
                          style={
                            styles.destinationMarkerIcon
                          }
                        >
                          💐
                        </Text>
                      </View>
                    </Marker>
                  ) : null
                ) : (
                  delivery.deliveryLocation &&
                  typeof delivery
                    .deliveryLocation
                    .latitude ===
                    'number' &&
                  typeof delivery
                    .deliveryLocation
                    .longitude ===
                    'number' ? (
                    <Marker
                      coordinate={{
                        latitude:
                          delivery
                            .deliveryLocation
                            .latitude,

                        longitude:
                          delivery
                            .deliveryLocation
                            .longitude,
                      }}
                      title="Customer Delivery"
                      description={
                        formatAddress(
                          delivery.deliveryAddress
                        )
                      }
                    >
                      <View
                        style={[
                          styles.destinationMarker,
                          styles.activeDestinationMarker,
                        ]}
                      >
                        <Text
                          style={
                            styles.destinationMarkerIcon
                          }
                        >
                          📍
                        </Text>
                      </View>
                    </Marker>
                  ) : null
                )}
              </MapView>

              <Pressable
                style={({ pressed }) => [
                  styles.recenterButton,

                  pressed &&
                    styles.recenterPressed,
                ]}
                onPress={
                  fitMapToRoute
                }
              >
                <Text
                  style={
                    styles.recenterIcon
                  }
                >
                  ◎
                </Text>

                <Text
                  style={
                    styles.recenterText
                  }
                >
                  Recenter
                </Text>
              </Pressable>

              <View
                style={
                  styles.routeStatusBadge
                }
              >
                <View
                  style={[
                    styles.routeStatusDot,

                    routeCoordinates.length >
                    1
                      ? styles.routeStatusReady
                      : styles.routeStatusWaiting,
                  ]}
                />

                <Text
                  style={
                    styles.routeStatusText
                  }
                >
                  {routeCoordinates.length >
                  1
                    ? 'Route active'
                    : 'Finding route'}
                </Text>
              </View>
            </View>
          </View>

          {/* NAVIGATION SUMMARY */}

          <View
            style={
              styles.navigationCard
            }
          >
            <View
              style={
                styles.destinationHeader
              }
            >
              <View
                style={
                  styles.destinationHeaderText
                }
              >
                <Text
                  style={
                    styles.destinationLabel
                  }
                >
                  NAVIGATING TO
                </Text>

                <Text
                  style={
                    styles.destinationTitle
                  }
                >
                  {destinationTitle}
                </Text>
              </View>

              <Text
                style={
                  styles.navigationIcon
                }
              >
                ➤
              </Text>
            </View>

            <Text
              style={
                styles.destinationAddress
              }
            >
              {destinationAddress}
            </Text>

            {delivery.deliveryAddress
              ?.landmark &&
              !shouldShowPickup && (
              <Text
                style={
                  styles.landmark
                }
              >
                Landmark:{' '}
                {
                  delivery
                    .deliveryAddress
                    .landmark
                }
              </Text>
            )}

            <View
              style={
                styles.navigationStats
              }
            >
              <NavigationStat
                value={formatDistance(
                  currentNavigation
                    ?.distanceMeters
                )}
                label="Distance"
              />

              <View
                style={
                  styles.statDivider
                }
              />

              <NavigationStat
                value={formatDuration(
                  currentNavigation
                    ?.durationSeconds
                )}
                label="Travel Time"
              />

              <View
                style={
                  styles.statDivider
                }
              />

              <NavigationStat
                value={formatETA(
                  currentNavigation
                    ?.estimatedArrivalAt
                )}
                label="ETA"
              />
            </View>
          </View>

          {/* DETAILS */}

          <View
            style={
              styles.detailsCard
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery Details
            </Text>

            <DetailRow
              label="Recipient"
              value={
                delivery.recipientName
              }
            />

            <DetailRow
              label="Phone"
              value={
                delivery
                  .recipientPhoneNumber
              }
            />

            <DetailRow
              label="Pickup"
              value={formatAddress(
                delivery.pickupAddress
              )}
            />

            <DetailRow
              label="Deliver To"
              value={formatAddress(
                delivery.deliveryAddress
              )}
            />
          </View>

          {/* ACCEPTED ACTION */}

          {delivery.status ===
            'accepted' && (
            <Pressable
              disabled={
                actionLoading
              }
              style={({ pressed }) => [
                styles.primaryButton,

                pressed &&
                  styles.pressed,

                actionLoading &&
                  styles.disabled,
              ]}
              onPress={
                handlePickup
              }
            >
              {actionLoading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Bouquet Picked Up
                </Text>
              )}
            </Pressable>
          )}

          {/* PICKED UP ACTION */}

          {delivery.status ===
            'picked_up' && (
            <Pressable
              disabled={
                actionLoading
              }
              style={({ pressed }) => [
                styles.primaryButton,

                pressed &&
                  styles.pressed,

                actionLoading &&
                  styles.disabled,
              ]}
              onPress={
                handleStartDelivery
              }
            >
              {actionLoading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Start Delivery →
                </Text>
              )}
            </Pressable>
          )}

          {/* ===================================================
              PROOF OF DELIVERY
              =================================================== */}

          {delivery.status ===
            'out_for_delivery' && (
            <>
              <View
                style={
                  styles.proofCard
                }
              >
                <View
                  style={
                    styles.proofHeader
                  }
                >
                  <View
                    style={
                      styles.proofIconCircle
                    }
                  >
                    <Text
                      style={
                        styles.proofIcon
                      }
                    >
                      📷
                    </Text>
                  </View>

                  <View
                    style={
                      styles.proofHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.proofLabel
                      }
                    >
                      REQUIRED
                    </Text>

                    <Text
                      style={
                        styles.proofTitle
                      }
                    >
                      Proof of Delivery
                    </Text>
                  </View>

                  {hasUploadedProof && (
                    <View
                      style={
                        styles.proofUploadedBadge
                      }
                    >
                      <Text
                        style={
                          styles.proofUploadedBadgeText
                        }
                      >
                        ✓ UPLOADED
                      </Text>
                    </View>
                  )}
                </View>

                {!hasUploadedProof && (
                  <Text
                    style={
                      styles.proofDescription
                    }
                  >
                    Take a photo after handing the bouquet to the recipient. The delivery cannot be completed until the photo is successfully uploaded.
                  </Text>
                )}

                {/* NO PHOTO YET */}

                {!hasUploadedProof &&
                  !proofPhoto && (
                  <Pressable
                    disabled={
                      proofUploading
                    }
                    style={({ pressed }) => [
                      styles.takePhotoButton,

                      pressed &&
                        styles.pressed,

                      proofUploading &&
                        styles.disabled,
                    ]}
                    onPress={
                      handleTakeProofPhoto
                    }
                  >
                    <Text
                      style={
                        styles.takePhotoIcon
                      }
                    >
                      📷
                    </Text>

                    <Text
                      style={
                        styles.takePhotoText
                      }
                    >
                      Take Proof Photo
                    </Text>
                  </Pressable>
                )}

                {/* LOCAL PHOTO PREVIEW */}

                {!hasUploadedProof &&
                  proofPhoto && (
                  <>
                    <View
                      style={
                        styles.proofPreviewContainer
                      }
                    >
                      <Image
                        source={{
                          uri:
                            proofPhoto.uri,
                        }}
                        style={
                          styles.proofPreview
                        }
                        resizeMode="cover"
                      />

                      <View
                        style={
                          styles.localPhotoBadge
                        }
                      >
                        <Text
                          style={
                            styles.localPhotoBadgeText
                          }
                        >
                          NOT UPLOADED
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.proofWarningBox
                      }
                    >
                      <Text
                        style={
                          styles.proofWarningIcon
                        }
                      >
                        !
                      </Text>

                      <Text
                        style={
                          styles.proofWarningText
                        }
                      >
                        This photo is only stored on your device right now. Upload it before completing the delivery.
                      </Text>
                    </View>

                    <View
                      style={
                        styles.proofButtonRow
                      }
                    >
                      <Pressable
                        disabled={
                          proofUploading
                        }
                        style={({ pressed }) => [
                          styles.retakeButton,

                          pressed &&
                            styles.pressed,

                          proofUploading &&
                            styles.disabled,
                        ]}
                        onPress={
                          handleRetakeProofPhoto
                        }
                      >
                        <Text
                          style={
                            styles.retakeButtonText
                          }
                        >
                          Retake
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={
                          proofUploading
                        }
                        style={({ pressed }) => [
                          styles.uploadProofButton,

                          pressed &&
                            styles.pressed,

                          proofUploading &&
                            styles.disabled,
                        ]}
                        onPress={
                          handleUploadProof
                        }
                      >
                        {proofUploading ? (
                          <ActivityIndicator
                            color="#FFFFFF"
                          />
                        ) : (
                          <Text
                            style={
                              styles.uploadProofButtonText
                            }
                          >
                            Upload Proof
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}

                {/* SERVER CONFIRMED */}

                {hasUploadedProof && (
                  <View
                    style={
                      styles.proofSuccessBox
                    }
                  >
                    <View
                      style={
                        styles.proofSuccessIcon
                      }
                    >
                      <Text
                        style={
                          styles.proofSuccessIconText
                        }
                      >
                        ✓
                      </Text>
                    </View>

                    <View
                      style={
                        styles.proofSuccessContent
                      }
                    >
                      <Text
                        style={
                          styles.proofSuccessTitle
                        }
                      >
                        Proof successfully uploaded
                      </Text>

                      <Text
                        style={
                          styles.proofSuccessText
                        }
                      >
                        The server confirmed your proof of delivery. You can now complete this delivery.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* MARK DELIVERED */}

              <Pressable
                disabled={
                  actionLoading ||
                  proofUploading ||
                  !hasUploadedProof
                }
                style={({ pressed }) => [
                  styles.deliveredButton,

                  pressed &&
                    hasUploadedProof &&
                    styles.pressed,

                  (
                    actionLoading ||
                    proofUploading ||
                    !hasUploadedProof
                  ) &&
                    styles.deliveredButtonDisabled,
                ]}
                onPress={
                  handleDelivered
                }
              >
                {actionLoading ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {hasUploadedProof
                        ? 'Mark as Delivered ✓'
                        : '🔒 Mark as Delivered'}
                    </Text>

                    {!hasUploadedProof && (
                      <Text
                        style={
                          styles.deliveredDisabledHint
                        }
                      >
                        Upload proof first
                      </Text>
                    )}
                  </>
                )}
              </Pressable>
            </>
          )}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * SMALL COMPONENTS
 * =========================================================
 */

function NavigationStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      style={
        styles.navigationStat
      }
    >
      <Text
        style={
          styles.navigationStatValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.navigationStatLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F5F6',
    },

    screen: {
      flex: 1,
      backgroundColor: '#F5F5F6',
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: '#F5F5F6',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 25,
    },

    loadingText: {
      color: '#8C8588',
      fontSize: 12,
      marginTop: 12,
    },

    errorTitle: {
      color: '#484145',
      fontSize: 20,
      fontWeight: '800',
    },

    header: {
      backgroundColor: '#C99730',
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 16,
    },

    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(255,255,255,0.17)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    backButtonText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
    },

    headerTitleArea: {
      flex: 1,
      paddingHorizontal: 12,
    },

    headerLabel: {
      color:
        'rgba(255,255,255,0.76)',
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 0.8,
    },

    headerTitle: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '800',
      marginTop: 3,
    },

    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        'rgba(255,255,255,0.17)',
      paddingHorizontal: 10,
      height: 27,
      borderRadius: 14,
    },

    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#72E08B',
      marginRight: 5,
    },

    liveText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '800',
    },

    statusPill: {
      alignSelf: 'flex-start',
      backgroundColor:
        'rgba(255,255,255,0.16)',
      borderRadius: 12,
      paddingHorizontal: 11,
      paddingVertical: 5,
      marginTop: 12,
    },

    statusText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '800',
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 15,
    },

    gpsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 2,
    },

    gpsIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFF4DA',
      alignItems: 'center',
      justifyContent: 'center',
    },

    gpsIconText: {
      fontSize: 18,
    },

    gpsInfo: {
      flex: 1,
      paddingHorizontal: 11,
    },

    gpsTitle: {
      color: '#403A3D',
      fontSize: 11,
      fontWeight: '800',
    },

    gpsStatus: {
      fontSize: 8,
      fontWeight: '600',
      marginTop: 3,
    },

    gpsOnline: {
      color: '#54B76D',
    },

    gpsOffline: {
      color: '#D26969',
    },

    gpsUpdated: {
      color: '#AAA4A7',
      fontSize: 7,
      marginTop: 3,
    },

    enableGpsButton: {
      backgroundColor: '#C99730',
      borderRadius: 13,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },

    enableGpsText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '700',
    },

    errorCard: {
      backgroundColor: '#FFF0F0',
      borderRadius: 12,
      padding: 11,
      marginTop: 9,
    },

    errorText: {
      color: '#CA6262',
      fontSize: 9,
      lineHeight: 14,
    },

    mapCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 17,
      padding: 12,
      marginTop: 12,
      elevation: 2,
      overflow: 'hidden',
    },

    mapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 3,
      paddingTop: 2,
      paddingBottom: 10,
    },

    mapLabel: {
      color: '#A69D93',
      fontSize: 7,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    mapTitle: {
      color: '#413B3D',
      fontSize: 14,
      fontWeight: '800',
      marginTop: 3,
    },

    mapLiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EEF8F0',
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    mapLiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#59A875',
      marginRight: 5,
    },

    mapLiveText: {
      color: '#59A875',
      fontSize: 7,
      fontWeight: '800',
    },

    mapContainer: {
      height: 285,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#ECEAE8',
    },

    map: {
      ...StyleSheet.absoluteFillObject,
    },

    riderMarkerOuter: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        'rgba(201,151,48,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    riderMarker: {
      width: 31,
      height: 31,
      borderRadius: 16,
      backgroundColor: '#C99730',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
    },

    riderMarkerText: {
      fontSize: 15,
    },

    destinationMarker: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#C99730',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },

    activeDestinationMarker: {
      borderWidth: 3,
      transform: [
        {
          scale: 1.08,
        },
      ],
    },

    destinationMarkerIcon: {
      fontSize: 15,
    },

    recenterButton: {
      position: 'absolute',
      right: 10,
      bottom: 11,
      height: 34,
      backgroundColor:
        'rgba(255,255,255,0.96)',
      borderRadius: 17,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
    },

    recenterPressed: {
      opacity: 0.75,
    },

    recenterIcon: {
      color: '#C99730',
      fontSize: 15,
      fontWeight: '800',
      marginRight: 4,
    },

    recenterText: {
      color: '#575053',
      fontSize: 8,
      fontWeight: '700',
    },

    routeStatusBadge: {
      position: 'absolute',
      left: 10,
      top: 10,
      backgroundColor:
        'rgba(255,255,255,0.94)',
      borderRadius: 13,
      paddingHorizontal: 9,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 3,
    },

    routeStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    routeStatusReady: {
      backgroundColor: '#59A875',
    },

    routeStatusWaiting: {
      backgroundColor: '#D5A339',
    },

    routeStatusText: {
      color: '#575053',
      fontSize: 7,
      fontWeight: '700',
    },

    navigationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 17,
      padding: 15,
      marginTop: 12,
      elevation: 2,
    },

    destinationHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    destinationHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    destinationLabel: {
      color: '#A69D93',
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 0.7,
    },

    destinationTitle: {
      color: '#413B3D',
      fontSize: 16,
      fontWeight: '800',
      marginTop: 3,
    },

    navigationIcon: {
      color: '#C99730',
      fontSize: 26,
    },

    destinationAddress: {
      color: '#777074',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 10,
    },

    landmark: {
      color: '#A29A9E',
      fontSize: 8,
      marginTop: 5,
    },

    navigationStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FBF8F1',
      borderRadius: 13,
      marginTop: 14,
      paddingVertical: 12,
    },

    navigationStat: {
      flex: 1,
      alignItems: 'center',
    },

    navigationStatValue: {
      color: '#C18E2A',
      fontSize: 14,
      fontWeight: '800',
    },

    navigationStatLabel: {
      color: '#9E9793',
      fontSize: 7,
      marginTop: 3,
    },

    statDivider: {
      height: 28,
      width: 1,
      backgroundColor: '#E9E3D7',
    },

    detailsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 15,
      marginTop: 12,
      elevation: 2,
    },

    sectionTitle: {
      color: '#403A3D',
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 7,
    },

    detailRow: {
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: '#F2F0F1',
    },

    detailLabel: {
      color: '#A29CA0',
      fontSize: 8,
      fontWeight: '600',
    },

    detailValue: {
      color: '#514A4E',
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },

    /*
     * =========================================================
     * STANDARD ACTION BUTTONS
     * =========================================================
     */

    primaryButton: {
      height: 54,
      backgroundColor: '#C99730',
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 15,
    },

    deliveredButton: {
      minHeight: 54,
      backgroundColor: '#59A875',
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      paddingVertical: 11,
    },

    deliveredButtonDisabled: {
      backgroundColor: '#B8B8B8',
      opacity: 0.75,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    deliveredDisabledHint: {
      color:
        'rgba(255,255,255,0.8)',
      fontSize: 8,
      marginTop: 2,
      fontWeight: '600',
    },

    pressed: {
      opacity: 0.8,
    },

    disabled: {
      opacity: 0.6,
    },

    /*
     * =========================================================
     * PROOF OF DELIVERY
     * =========================================================
     */

    proofCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 17,
      padding: 15,
      marginTop: 15,
      elevation: 2,
    },

    proofHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    proofIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFF4DA',
      alignItems: 'center',
      justifyContent: 'center',
    },

    proofIcon: {
      fontSize: 19,
    },

    proofHeaderText: {
      flex: 1,
      paddingHorizontal: 11,
    },

    proofLabel: {
      color: '#C99730',
      fontSize: 7,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    proofTitle: {
      color: '#403A3D',
      fontSize: 14,
      fontWeight: '800',
      marginTop: 2,
    },

    proofUploadedBadge: {
      backgroundColor: '#EAF7EE',
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    proofUploadedBadgeText: {
      color: '#4C9B64',
      fontSize: 7,
      fontWeight: '800',
    },

    proofDescription: {
      color: '#817A7E',
      fontSize: 9,
      lineHeight: 15,
      marginTop: 12,
    },

    takePhotoButton: {
      minHeight: 52,
      borderWidth: 1.5,
      borderColor: '#C99730',
      borderStyle: 'dashed',
      borderRadius: 14,
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFBF3',
    },

    takePhotoIcon: {
      fontSize: 17,
      marginRight: 8,
    },

    takePhotoText: {
      color: '#B78427',
      fontSize: 11,
      fontWeight: '800',
    },

    proofPreviewContainer: {
      height: 240,
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: 14,
      position: 'relative',
      backgroundColor: '#EEECEB',
    },

    proofPreview: {
      width: '100%',
      height: '100%',
    },

    localPhotoBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor:
        'rgba(48,44,46,0.78)',
      borderRadius: 11,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    localPhotoBadgeText: {
      color: '#FFFFFF',
      fontSize: 7,
      fontWeight: '800',
    },

    proofWarningBox: {
      backgroundColor: '#FFF8E9',
      borderRadius: 12,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 10,
    },

    proofWarningIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#E0AD45',
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 20,
      fontSize: 11,
      fontWeight: '900',
      marginRight: 8,
    },

    proofWarningText: {
      flex: 1,
      color: '#8F733A',
      fontSize: 8,
      lineHeight: 13,
    },

    proofButtonRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 9,
    },

    retakeButton: {
      minHeight: 48,
      flex: 0.42,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: '#D8D4D6',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },

    retakeButtonText: {
      color: '#675F63',
      fontSize: 10,
      fontWeight: '700',
    },

    uploadProofButton: {
      minHeight: 48,
      flex: 0.58,
      borderRadius: 13,
      backgroundColor: '#C99730',
      alignItems: 'center',
      justifyContent: 'center',
    },

    uploadProofButtonText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },

    proofSuccessBox: {
      backgroundColor: '#EEF8F1',
      borderRadius: 13,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 13,
    },

    proofSuccessIcon: {
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor: '#59A875',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    proofSuccessIconText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
    },

    proofSuccessContent: {
      flex: 1,
    },

    proofSuccessTitle: {
      color: '#4B8E5F',
      fontSize: 10,
      fontWeight: '800',
    },

    proofSuccessText: {
      color: '#75937D',
      fontSize: 8,
      lineHeight: 13,
      marginTop: 3,
    },

    /*
     * =========================================================
     * RETURN BUTTON
     * =========================================================
     */

    returnButton: {
      height: 48,
      backgroundColor: '#C99730',
      borderRadius: 14,
      paddingHorizontal: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },

    returnButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    bottomSpacer: {
      height: 30,
    },
  });