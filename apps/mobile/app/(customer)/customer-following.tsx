import { useCallback, useEffect, useState } from 'react';

import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import { apiRequest } from '../../services/api';
import { getFlowerImageUrl } from '../../services/flower';
import { getFollowedShops, setFollowing, type FollowedShop } from '../../services/follows';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * FOLLOWING (Customer)
 * =========================================================
 *
 * Shops the customer follows, with their latest bouquets.
 * Followers get a notification when a shop adds a bouquet.
 * =========================================================
 */

const PINK = '#DF628F';
const TEXT = '#3B3438';
const MUTED = '#7C7579';

type ShopFlower = { _id: string; name: string; price: number; images?: string[] };

type FlowersResponse = { success: boolean; data: { flowers: ShopFlower[] } };

const peso = (value: number) => `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

export default function CustomerFollowingScreen() {
  const insets = useSafeAreaInsets();

  const [shops, setShops] = useState<FollowedShop[]>([]);
  const [flowersByShop, setFlowersByShop] = useState<Record<string, ShopFlower[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const followed = await getFollowedShops();
      setShops(followed);

      const entries = await Promise.all(
        followed.map(async shop => {
          try {
            const response = await apiRequest<FlowersResponse>(
              `/flowers?florist=${encodeURIComponent(shop.florist._id)}`,
              { method: 'GET' }
            );
            return [shop.florist._id, (response.data.flowers || []).slice(0, 8)] as const;
          } catch {
            return [shop.florist._id, []] as const;
          }
        })
      );

      setFlowersByShop(Object.fromEntries(entries));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load followed shops.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unfollow = (shop: FollowedShop) => {
    Alert.alert('Unfollow shop', `Stop following ${shop.florist.shopName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow',
        style: 'destructive',
        onPress: async () => {
          try {
            await setFollowing(shop.florist._id, false);
            setShops(current => current.filter(item => item.florist._id !== shop.florist._id));
          } catch (unfollowError) {
            Alert.alert('Could not unfollow', unfollowError instanceof Error ? unfollowError.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ScreenLoader role="customer" message="Loading shops you follow..." />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role="customer"
        title="Following"
        subtitle={`${shops.length} shop${shops.length === 1 ? '' : 's'}`}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={PINK}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {error ? (
          <ErrorState role="customer" message={error} onRetry={() => void load()} />
        ) : shops.length === 0 ? (
          <EmptyState
            role="customer"
            icon="storefront-outline"
            title="No followed shops yet"
            message="Tap Follow on a bouquet page to get notified when that shop adds new bouquets."
            action={{ label: 'Discover bouquets', onPress: () => router.push('/(customer)/customer-discover' as never) }}
          />
        ) : (
          shops.map(shop => {
            const logo = getUploadUrl(shop.florist.shopLogo);
            const flowers = flowersByShop[shop.florist._id] || [];

            return (
              <View key={shop.florist._id} style={styles.card}>
                <View style={styles.shopRow}>
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logo, styles.logoFallback]}>
                      <Ionicons name="storefront-outline" size={20} color={PINK} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{shop.florist.shopName}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[shop.florist.address?.city, shop.florist.address?.province].filter(Boolean).join(', ') ||
                        'Florist shop'}
                    </Text>
                  </View>
                  <Pressable onPress={() => unfollow(shop)} style={styles.followingButton}>
                    <Text style={styles.followingText}>Following</Text>
                  </Pressable>
                </View>

                {flowers.length === 0 ? (
                  <Text style={[styles.meta, { marginTop: 10 }]}>No bouquets available right now.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flowers}>
                    {flowers.map(flower => {
                      const image = getFlowerImageUrl(flower.images?.[0]);

                      return (
                        <Pressable
                          key={flower._id}
                          onPress={() =>
                            router.push({
                              pathname: '/(customer)/customer-product-details',
                              params: { flowerId: flower._id },
                            } as never)
                          }
                          style={styles.flower}
                        >
                          {image ? (
                            <Image source={{ uri: image }} style={styles.flowerImage} />
                          ) : (
                            <View style={[styles.flowerImage, styles.logoFallback]}>
                              <Ionicons name="flower-outline" size={22} color={PINK} />
                            </View>
                          )}
                          <Text style={styles.flowerName} numberOfLines={1}>{flower.name}</Text>
                          <Text style={styles.flowerPrice}>{peso(flower.price)}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBF7F9' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#F1E4EA', backgroundColor: '#FFFFFF' },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 46, height: 46, borderRadius: 23 },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCE8F0' },
  shopName: { color: TEXT, fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 2, color: MUTED, fontSize: 12 },
  followingButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: PINK },
  followingText: { color: PINK, fontSize: 12, fontWeight: '800' },
  flowers: { gap: 10, paddingTop: 12 },
  flower: { width: 118 },
  flowerImage: { width: 118, height: 118, borderRadius: 14, backgroundColor: '#F6EEF2' },
  flowerName: { marginTop: 6, color: TEXT, fontSize: 13, fontWeight: '700' },
  flowerPrice: { marginTop: 2, color: PINK, fontSize: 13, fontWeight: '800' },
});
