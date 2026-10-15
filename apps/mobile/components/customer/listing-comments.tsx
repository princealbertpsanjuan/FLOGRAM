import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { SeeAllButton, useSeeAll } from '../ui/see-all';
import { ROLE_ACCENT } from '../ui/state-views';
import { getStoredUser } from '../../services/auth';
import {
  deleteListingComment,
  getListingFeedback,
  postListingComment,
  type ListingFeedback,
} from '../../services/listing-comments';

/*
 * =========================================================
 * REVIEWS & COMMENTS (bouquet listing)
 * =========================================================
 *
 * Reviews from customers who bought this bouquet, plus
 * public comments/questions. The shop can reply.
 *
 * Shared by the customer product page (role "customer",
 * pink) and the seller's per-product feedback screen
 * (role "seller", green). A failed load shows an error
 * with a retry instead of hiding the section.
 * =========================================================
 */

type FeedRole = 'customer' | 'seller';

const ACCENT_TINT: Record<FeedRole, string> = {
  customer: '#FCE8F0',
  seller: '#E8F2EC',
};

const TEXT = '#3B3438';
const MUTED = '#7C7579';

const timeAgo = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Stars = ({ value }: { value: number }) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map(star => (
      <Ionicons key={star} name={value >= star ? 'star' : value >= star - 0.5 ? 'star-half' : 'star-outline'} size={13} color="#E0A31A" />
    ))}
  </View>
);

export default function ListingComments({
  flowerId,
  role = 'customer',
  onLoaded,
  style,
}: {
  flowerId?: string | null;
  role?: FeedRole;
  onLoaded?: (data: ListingFeedback) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const accent = ROLE_ACCENT[role];
  const [data, setData] = useState<ListingFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [canComment, setCanComment] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  // Kept in a ref so an inline callback does not re-trigger the fetch.
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const load = useCallback(async () => {
    if (!flowerId) return;
    try {
      setLoadError('');
      const next = await getListingFeedback(flowerId);
      setData(next);
      onLoadedRef.current?.(next);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load reviews and comments.');
    } finally {
      setLoading(false);
    }
  }, [flowerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getStoredUser().then(user => {
      setUserId(user?._id || null);
      setCanComment(user?.role === 'customer' || user?.role === 'seller');
    });
  }, []);

  const feed = data
    ? [
        ...data.reviews.map(review => ({ kind: 'review' as const, ...review })),
        ...data.comments.map(comment => ({ kind: 'comment' as const, ...comment })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const seeAll = useSeeAll(feed, { resetKey: flowerId });

  if (!flowerId) {
    return null;
  }

  if (!data) {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.title}>Reviews & Comments</Text>
        {loading ? (
          <ActivityIndicator color={accent} style={{ marginVertical: 14 }} />
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.empty}>{loadError || 'Could not load reviews and comments.'}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                void load();
              }}
              style={[styles.retry, { borderColor: accent }]}
            >
              <Ionicons name="refresh" size={14} color={accent} />
              <Text style={[styles.moreText, { color: accent }]}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const post = async () => {
    if (!text.trim()) return;

    try {
      setPosting(true);
      await postListingComment(flowerId, text.trim());
      setText('');
      await load();
    } catch (error) {
      Alert.alert('Could not post', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const remove = (commentId: string) => {
    Alert.alert('Delete comment', 'Remove your comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteListingComment(commentId);
            await load();
          } catch (error) {
            Alert.alert('Could not delete', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Reviews & Comments</Text>
        {data.averageRating ? (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color="#E0A31A" />
            <Text style={styles.ratingText}>
              {data.averageRating.toFixed(1)} · {data.reviewCount} review{data.reviewCount === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>

      {feed.length === 0 ? (
        <Text style={styles.empty}>
          {role === 'seller'
            ? 'No reviews or comments on this listing yet.'
            : 'No reviews or comments yet. Be the first to ask the shop a question.'}
        </Text>
      ) : (
        seeAll.visible.map(entry => (
          <View key={`${entry.kind}-${entry._id}`} style={styles.entry}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: ACCENT_TINT[role] },
                entry.kind === 'comment' && entry.authorRole === 'seller' && styles.shopAvatar,
              ]}
            >
              <Text style={[styles.avatarText, { color: accent }]}>
                {entry.kind === 'comment' && entry.authorRole === 'seller' ? '🌸' : entry.authorName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.entryHeader}>
                <Text style={styles.author}>{entry.authorName}</Text>
                {entry.kind === 'review' ? (
                  <View style={styles.verified}>
                    <Ionicons name="checkmark-circle" size={12} color="#3E9B62" />
                    <Text style={styles.verifiedText}>Bought this</Text>
                  </View>
                ) : null}
                <Text style={styles.time}>{timeAgo(entry.createdAt)}</Text>
              </View>
              {entry.kind === 'review' ? <Stars value={entry.rating} /> : null}
              {(entry.kind === 'review' ? entry.comment : entry.text) ? (
                <Text style={styles.body}>{entry.kind === 'review' ? entry.comment : entry.text}</Text>
              ) : null}
              {entry.kind === 'comment' && entry.authorId && entry.authorId === userId ? (
                <Pressable onPress={() => remove(entry._id)} hitSlop={6}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      )}

      <SeeAllButton state={seeAll} role={role} />

      {canComment ? (
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={role === 'seller' ? 'Reply to your customers…' : 'Ask the shop or leave a comment…'}
            placeholderTextColor="#B5AEB2"
            maxLength={500}
            multiline
            style={styles.input}
          />
          <Pressable
            accessibilityLabel={role === 'seller' ? 'Post reply' : 'Post comment'}
            disabled={posting || !text.trim()}
            onPress={() => void post()}
            style={[styles.send, { backgroundColor: accent }, (posting || !text.trim()) && { opacity: 0.5 }]}
          >
            {posting ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="send" size={16} color="#FFFFFF" />}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { color: TEXT, fontSize: 16, fontWeight: '800' },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF6E5',
  },
  ratingText: { color: '#8A6410', fontSize: 12, fontWeight: '700' },
  empty: { marginTop: 4, color: MUTED, fontSize: 13, lineHeight: 19 },
  entry: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F6EEF2' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE8F0',
  },
  shopAvatar: { backgroundColor: '#E8F2EC' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  author: { color: TEXT, fontSize: 13, fontWeight: '800' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifiedText: { color: '#3E9B62', fontSize: 11, fontWeight: '700' },
  time: { color: MUTED, fontSize: 11 },
  body: { marginTop: 3, color: TEXT, fontSize: 13, lineHeight: 19 },
  delete: { marginTop: 4, color: '#C2413B', fontSize: 12, fontWeight: '700' },
  errorBox: { alignItems: 'flex-start', gap: 10, marginTop: 4 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  moreText: { fontSize: 13, fontWeight: '800' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    color: TEXT,
    fontSize: 14,
    backgroundColor: '#F7F2F4',
  },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
