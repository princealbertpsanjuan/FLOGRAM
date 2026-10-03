import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getMyBloomboardComments,
  getMyLikedPosts,
  getMySavedPosts,
  type BloomboardMyComment,
  type BloomboardPost,
} from '../../services/bloomboard';

import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * CUSTOMER – MY ACTIVITY
 * =========================================================
 *
 * Me → Liked Posts / Saved Items / My Comments
 *
 * tab=liked | saved | comments
 * =========================================================
 */

type Tab = 'liked' | 'saved' | 'comments';

const PINK = '#DF628F';
const TEXT = '#2D2A2E';
const MUTED = '#77717A';

const GRID_GAP = 3;
const TILE = (Dimensions.get('window').width - 32 - GRID_GAP * 2) / 3;

const isTab = (value: unknown): value is Tab =>
  value === 'liked' || value === 'saved' || value === 'comments';

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Unable to load your activity.';

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

const authorName = (post: BloomboardPost) =>
  post.florist?.shopName ||
  [post.author?.firstName, post.author?.lastName].filter(Boolean).join(' ') ||
  'FLOGRAM member';

export default function CustomerActivityScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'liked');
  const [liked, setLiked] = useState<BloomboardPost[]>([]);
  const [saved, setSaved] = useState<BloomboardPost[]>([]);
  const [comments, setComments] = useState<BloomboardMyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BloomboardPost | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [likedPosts, savedPosts, myComments] = await Promise.all([
        getMyLikedPosts(),
        getMySavedPosts(),
        getMyBloomboardComments(),
      ]);
      setLiked(likedPosts);
      setSaved(savedPosts);
      setComments(myComments);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const posts = tab === 'liked' ? liked : saved;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace('/(customer)/customer-profile' as never)
          }
          style={styles.back}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={TEXT}
          />
        </Pressable>
        <Text style={styles.title}>My Activity</Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ['liked', 'Liked', liked.length],
            ['saved', 'Saved', saved.length],
            ['comments', 'Comments', comments.length],
          ] as const
        ).map(([key, label, count]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
              {loading ? '' : ` (${count})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PINK}
            colors={[PINK]}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            size="large"
            color={PINK}
          />
        ) : tab === 'comments' ? (
          comments.length === 0 ? (
            <Empty
              icon="chatbubble-outline"
              text="Comments you write on BloomBoard posts will appear here."
            />
          ) : (
            comments.map(comment => {
              const image = getUploadUrl(comment.post.images?.[0]);
              return (
                <Pressable
                  key={comment._id}
                  onPress={() => setSelected(comment.post)}
                  style={styles.commentRow}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.commentThumb}
                    />
                  ) : (
                    <View style={[styles.commentThumb, styles.thumbPlaceholder]}>
                      <Ionicons
                        name="flower-outline"
                        size={18}
                        color={PINK}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.commentText}
                      numberOfLines={3}
                    >
                      “{comment.content}”
                    </Text>
                    <Text style={styles.meta}>
                      On {authorName(comment.post)}’s post · {formatDate(comment.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )
        ) : posts.length === 0 ? (
          <Empty
            icon={tab === 'liked' ? 'heart-outline' : 'bookmark-outline'}
            text={
              tab === 'liked'
                ? 'Posts you like on Discover and BloomBoard will appear here.'
                : 'Tap Save on a bouquet post to keep it here for later.'
            }
          />
        ) : (
          <View style={styles.grid}>
            {posts.map(post => {
              const image = getUploadUrl(post.images?.[0]);
              return (
                <Pressable
                  key={post._id}
                  onPress={() => setSelected(post)}
                  style={styles.tile}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.tileImage}
                    />
                  ) : (
                    <View style={[styles.tileImage, styles.thumbPlaceholder]}>
                      <Ionicons
                        name="flower-outline"
                        size={22}
                        color={PINK}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* POST PREVIEW */}
      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setSelected(null)}
        >
          {selected ? (
            <Pressable style={styles.preview}>
              {getUploadUrl(selected.images?.[0]) ? (
                <Image
                  source={{ uri: getUploadUrl(selected.images?.[0]) as string }}
                  style={styles.previewImage}
                />
              ) : null}
              <View style={styles.previewBody}>
                <Text style={styles.previewAuthor}>{authorName(selected)}</Text>
                {selected.caption ? (
                  <Text style={styles.previewCaption}>{selected.caption}</Text>
                ) : null}
                <View style={styles.previewStats}>
                  <Ionicons
                    name="heart"
                    size={15}
                    color={PINK}
                  />
                  <Text style={styles.meta}>{selected.likeCount ?? 0}</Text>
                  <Ionicons
                    name="chatbubble-outline"
                    size={15}
                    color={MUTED}
                  />
                  <Text style={styles.meta}>{selected.commentCount ?? 0}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setSelected(null);
                    router.push('/(customer)/customer-bloomboard' as never);
                  }}
                  style={styles.previewButton}
                >
                  <Text style={styles.previewButtonText}>Open BloomBoard</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name={icon}
        size={30}
        color={PINK}
      />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF8F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 4, color: TEXT, fontSize: 19, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDEF',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: PINK },
  tabText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: PINK, fontWeight: '800' },
  content: { padding: 16 },
  error: { marginBottom: 12, color: '#C64262', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: TILE, height: TILE },
  tileImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#F3EEF1' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCE8F0' },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  commentThumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#F3EEF1' },
  commentText: { color: TEXT, fontSize: 14, lineHeight: 20 },
  meta: { marginTop: 4, color: MUTED, fontSize: 12 },
  empty: { alignItems: 'center', gap: 10, marginTop: 50, paddingHorizontal: 30 },
  emptyText: { color: MUTED, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  preview: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  previewImage: { width: '100%', aspectRatio: 1, backgroundColor: '#F3EEF1' },
  previewBody: { padding: 16 },
  previewAuthor: { color: TEXT, fontSize: 15, fontWeight: '800' },
  previewCaption: { marginTop: 6, color: TEXT, fontSize: 14, lineHeight: 20 },
  previewStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  previewButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PINK,
  },
  previewButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
