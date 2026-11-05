import { useEffect, useState } from 'react';

import { ActivityIndicator, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * PROOF PHOTO
 * =========================================================
 *
 * One way to show every uploaded proof (remittance, payout,
 * delivery) or a photo picked from the phone before upload:
 *
 *  - local photos (file://, content://) are shown as they are
 *  - server paths (/uploads/...) get the server address
 *  - fixed width and height, so the photo never collapses
 *    to a blank box inside a modal or a centered row
 *  - tap = full screen
 *  - if it cannot load, says so (with "Open in browser")
 *    instead of staying blank
 * =========================================================
 */

const toDisplayUri = (value?: string | null) => {
  if (!value) return null;
  if (/^(file|content|ph|assets-library|data|blob):/i.test(value)) return value;
  return getUploadUrl(value);
};

export default function ProofPhoto({
  uri,
  label = 'Proof photo',
  height = 180,
}: {
  uri?: string | null;
  label?: string;
  height?: number;
}) {
  const displayUri = toDisplayUri(uri);
  const [loading, setLoading] = useState(Boolean(displayUri));
  const [failed, setFailed] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    setLoading(Boolean(displayUri));
    setFailed(false);
  }, [displayUri]);

  if (!displayUri) {
    return (
      <View style={[styles.box, styles.center, { height }]}>
        <Ionicons name="image-outline" size={22} color="#9A96A0" />
        <Text style={styles.muted}>No photo attached.</Text>
      </View>
    );
  }

  if (failed) {
    const isRemote = /^https?:/i.test(displayUri);

    return (
      <View style={[styles.box, styles.center, { height }]}>
        <Ionicons name="alert-circle-outline" size={22} color="#B45309" />
        <Text style={styles.errorText}>The photo could not be loaded.</Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              setFailed(false);
              setLoading(true);
            }}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>Try again</Text>
          </Pressable>
          {isRemote ? (
            <Pressable onPress={() => void Linking.openURL(displayUri)} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Open in browser</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`View ${label}`}
        onPress={() => setFullScreen(true)}
        style={[styles.box, { height }]}
      >
        <Image
          source={{ uri: displayUri }}
          style={styles.image}
          resizeMode="cover"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
        {loading ? (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator color="#5552B9" />
          </View>
        ) : (
          <View style={styles.hint}>
            <Ionicons name="expand-outline" size={12} color="#FFFFFF" />
            <Text style={styles.hintText}>Tap to view</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={fullScreen} transparent animationType="fade" onRequestClose={() => setFullScreen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFullScreen(false)}>
          <View style={styles.backdropHeader}>
            <Text style={styles.backdropTitle}>{label}</Text>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </View>
          <Image source={{ uri: displayUri }} style={styles.fullImage} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#EEEEF2',
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  image: { width: '100%', height: '100%' },
  muted: { color: '#77737B', fontSize: 12 },
  errorText: { color: '#92400E', fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  smallButtonText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  hint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  hintText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.92)' },
  backdropHeader: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backdropTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  fullImage: { width: '100%', height: '80%' },
});
