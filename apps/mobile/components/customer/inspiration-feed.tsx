import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { getStoredUser } from '../../services/auth';

import {
  getBloomboardFeed,
  setPostLiked,
  setPostSaved,
  type BloomboardFeedPost,
} from '../../services/bloomboard';

import {
  getFlowerImageUrl,
  getPublicFlowers,
  type FlowerListing,
} from '../../services/flower';

import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * DISCOVER – INSPIRATION FEED
 * =========================================================
 *
 * Image-first grid (Instagram-style) built from real
 * FLOGRAM content:
 *
 * - BloomBoard bouquet posts from the community/florists
 * - Available shop bouquets
 *
 * Tap        → open the post preview, or the product page
 * Long press → quick preview with Save (posts) or
 *              View Product (bouquets)
 * =========================================================
 */

type Tile =
  | {
      kind: 'post';
      id: string;
      image: string;
      createdAt: string;
      post: BloomboardFeedPost;
    }
  | {
      kind: 'product';
      id: string;
      image: string;
      createdAt: string;
      product: FlowerListing;
    };

const PINK = '#DF628F';
const TEXT = '#2D2A2E';
const MUTED = '#77717A';

const COLUMNS = 3;
const GAP = 3;
const TILE_SIZE = (Dimensions.get('window').width - 32 - GAP * (COLUMNS - 1)) / COLUMNS;

const postAuthor = (post: BloomboardFeedPost) =>
  post.florist?.shopName ||
  [post.author?.firstName, post.author?.lastName].filter(Boolean).join(' ') ||
  'FLOGRAM member';

type Props = {
  refreshKey: number;
};

export default function InspirationFeed({ refreshKey }: Props) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [preview, setPreview] = useState<Tile | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);

      const [posts, products, user] = await Promise.all([
        getBloomboardFeed(50).catch(() => [] as BloomboardFeedPost[]),
        getPublicFlowers({})
          .then(data => data.flowers ?? [])
          .catch(() => [] as FlowerListing[]),
        getStoredUser().catch(() => null),
      ]);

      setUserId(user?._id ?? null);

      const postTiles: Tile[] = posts
        .filter(post => post.images?.length)
        .map(post => ({
          kind: 'post',
          id: `post-${post._id}`,
          image: getUploadUrl(post.images?.[0]) ?? '',
          createdAt: post.createdAt ?? '',
          post,
        }));

      const productTiles: Tile[] = products
        .filter(product => product.images?.length)
        .map(product => ({
          kind: 'product',
          id: `product-${product._id}`,
          image: getFlowerImageUrl(product.images[0]) ?? '',
          createdAt: product.createdAt,
          product,
        }));

      setTiles(
        [...postTiles, ...productTiles]
          .filter(tile => tile.image)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Unable to load inspiration.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const updatePost = (postId: string, patch: Partial<BloomboardFeedPost>) => {
    setTiles(previous =>
      previous.map(tile =>
        tile.kind === 'post' && tile.post._id === postId
          ? { ...tile, post: { ...tile.post, ...patch } }
          : tile
      )
    );
    setPreview(previous =>
      previous && previous.kind === 'post' && previous.post._id === postId
        ? { ...previous, post: { ...previous.post, ...patch } }
        : previous
    );
  };

  const isLiked = (post: BloomboardFeedPost) =>
    Boolean(userId && post.likes?.map(String).includes(userId));

  const isSaved = (post: BloomboardFeedPost) =>
    Boolean(userId && post.saves?.map(String).includes(userId));

  const toggleLike = async (post: BloomboardFeedPost) => {
    if (!userId || busy) {
      return;
    }

    const next = !isLiked(post);
    setBusy(true);

    try {
      const result = await setPostLiked(post._id, next);
      const likes = next
        ? [...(post.likes ?? []), userId]
        : (post.likes ?? []).filter(id => String(id) !== userId);

      updatePost(post._id, {
        likes,
        likeCount: result?.likeCount ?? likes.length,
      });
    } catch (likeError) {
      Alert.alert('Like', likeError instanceof Error ? likeError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async (post: BloomboardFeedPost) => {
    if (!userId || busy) {
      return;
    }

    const next = !isSaved(post);
    setBusy(true);

    try {
      await setPostSaved(post._id, next);
      updatePost(post._id, {
        saves: next
          ? [...(post.saves ?? []), userId]
          : (post.saves ?? []).filter(id => String(id) !== userId),
      });
    } catch (saveError) {
      Alert.alert('Save', saveError instanceof Error ? saveError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const openProduct = (product: FlowerListing) => {
    setPreview(null);
    router.push({
      pathname: '/(customer)/customer-product-details',
      params: { flowerId: product._id },
    } as never);
  };

  const onTilePress = (tile: Tile) => {
    if (tile.kind === 'product') {
      openProduct(tile.product);
      return;
    }

    setPreview(tile);
  };

  const rows = useMemo(() => tiles, [tiles]);

  if (loading) {
    return (
      <ActivityIndicator
        style={{ marginTop: 40 }}
        size="large"
        color={PINK}
      />
    );
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="images-outline"
            size={32}
            color={PINK}
          />
          <Text style={styles.emptyText}>
            No inspiration yet. Bouquet posts and shop bouquets with photos will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {rows.map(tile => (
            <Pressable
              key={tile.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={
                tile.kind === 'product'
                  ? `${tile.product.name}, bouquet for sale`
                  : `Bouquet post by ${postAuthor(tile.post)}`
              }
              delayLongPress={300}
              onPress={() => onTilePress(tile)}
              onLongPress={() => setPreview(tile)}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
            >
              <Image
                source={{ uri: tile.image }}
                style={styles.tileImage}
              />
              {tile.kind === 'product' ? (
                <View style={styles.tileBadge}>
                  <Ionicons
                    name="bag-handle"
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              ) : (tile.post.images?.length ?? 0) > 1 ? (
                <View style={styles.tileBadge}>
                  <Ionicons
                    name="copy"
                    size={12}
                    color="#FFFFFF"
                  />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.hint}>Tap to open · Press and hold to preview</Text>

      {/* PREVIEW */}
      <Modal
        visible={Boolean(preview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setPreview(null)}
        >
          {preview ? (
            <Pressable style={styles.card}>
              <Image
                source={{ uri: preview.image }}
                style={styles.cardImage}
              />

              {preview.kind === 'post' ? (
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{postAuthor(preview.post)}</Text>
                  {preview.post.caption ? (
                    <Text
                      style={styles.cardText}
                      numberOfLines={4}
                    >
                      {preview.post.caption}
                    </Text>
                  ) : null}

                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void toggleLike(preview.post)}
                      style={styles.actionButton}
                    >
                      <Ionicons
                        name={isLiked(preview.post) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={PINK}
                      />
                      <Text style={styles.actionText}>{preview.post.likeCount ?? 0}</Text>
                    </Pressable>

                    <View style={styles.actionButton}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={20}
                        color={MUTED}
                      />
                      <Text style={styles.actionText}>{preview.post.commentCount ?? 0}</Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void toggleSave(preview.post)}
                      style={[styles.actionButton, { marginLeft: 'auto' }]}
                    >
                      <Ionicons
                        name={isSaved(preview.post) ? 'bookmark' : 'bookmark-outline'}
                        size={21}
                        color={PINK}
                      />
                      <Text style={styles.actionText}>
                        {isSaved(preview.post) ? 'Saved' : 'Save'}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => {
                      setPreview(null);
                      router.push('/(customer)/customer-bloomboard' as never);
                    }}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>View Comments on BloomBoard</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{preview.product.name}</Text>
                  <Text style={styles.cardText}>
                    {preview.product.florist?.shopName ?? 'FLOGRAM shop'} · ₱
                    {Number(preview.product.price || 0).toLocaleString('en-PH')}
                  </Text>
                  <Pressable
                    onPress={() => openProduct(preview.product)}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>View Bouquet</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { marginBottom: 10, color: '#C64262', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { width: TILE_SIZE, height: TILE_SIZE },
  tileImage: { width: '100%', height: '100%', borderRadius: 4, backgroundColor: '#F3EEF1' },
  tileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  hint: { marginTop: 12, color: MUTED, fontSize: 12, textAlign: 'center' },
  empty: { alignItems: 'center', gap: 10, marginTop: 40, paddingHorizontal: 30 },
  emptyText: { color: MUTED, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: '#F3EEF1' },
  cardBody: { padding: 16 },
  cardTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
  cardText: { marginTop: 6, color: TEXT, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: TEXT, fontSize: 14, fontWeight: '600' },
  primary: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PINK,
  },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
