import { useEffect, useState } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getFollowStatus, setFollowing } from '../../services/follows';

const PINK = '#DF628F';

/*
 * Follow / Following toggle for a florist shop.
 */
export default function FollowShopButton({ floristId }: { floristId?: string | null }) {
  const [following, setFollowingState] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!floristId) {
      return;
    }

    let active = true;

    getFollowStatus(floristId)
      .then(status => {
        if (active) {
          setFollowingState(status.isFollowing);
          setCount(status.followerCount);
        }
      })
      .catch(() => {
        // Follow is optional; hide errors.
      });

    return () => {
      active = false;
    };
  }, [floristId]);

  if (!floristId) {
    return null;
  }

  const toggle = async () => {
    setBusy(true);
    try {
      const status = await setFollowing(floristId, !following);
      setFollowingState(status.isFollowing);
      setCount(status.followerCount);
    } catch {
      // keep current state
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      disabled={busy}
      onPress={() => void toggle()}
      style={({ pressed }) => [
        styles.button,
        following ? styles.following : styles.follow,
        pressed && { opacity: 0.85 },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={following ? PINK : '#FFFFFF'}
        />
      ) : (
        <>
          <Ionicons
            name={following ? 'checkmark' : 'add'}
            size={15}
            color={following ? PINK : '#FFFFFF'}
          />
          <Text style={[styles.text, following && { color: PINK }]}>
            {following ? 'Following' : 'Follow'}
            {count > 0 ? ` · ${count}` : ''}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 92,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
  },
  follow: { backgroundColor: PINK },
  following: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: PINK },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
