import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminScreenHeader, {
  ADMIN_COLORS as C,
} from '../../components/admin/admin-screen-header';

import KeyboardSafeView from '../../components/ui/keyboard-safe-view';
import { SeeAllButton, useSeeAll } from '../../components/ui/see-all';
import { EmptyState, ErrorState } from '../../components/ui/state-views';

import {
  getAdminProducts,
  setAdminProductVisibility,
  type AdminProduct,
  type AdminProductShop,
  type AdminProductStatusFilter,
} from '../../services/admin-products';

import { getFlowerImageUrl } from '../../services/flower';

import { useDesktopWeb } from '../../hooks/use-desktop-web';

/*
 * =========================================================
 * ADMIN – PRODUCTS (SELLER LISTINGS)
 * =========================================================
 *
 * Every seller listing on FLOGRAM, filterable by name,
 * shop and visibility. Tapping a listing opens its full
 * details, where the Admin can hide it from customers or
 * restore it (the seller is notified either way).
 * =========================================================
 */

const STATUS_FILTERS: { label: string; value: AdminProductStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Visible', value: 'visible' },
  { label: 'Hidden', value: 'hidden' },
];

const formatPeso = (value?: number | null) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
};

/*
 * Visible   → customers can see and order it.
 * Hidden by Admin → the Admin hid it (can be restored).
 * Removed   → the seller deleted it.
 * Unavailable → active, but the seller marked it unavailable.
 */
const getListingStatus = (product: AdminProduct) => {
  if (product.isActive && product.isAvailable) {
    return { label: 'Visible', fg: C.green, bg: C.greenLight };
  }

  if (product.hiddenByAdmin) {
    return { label: 'Hidden by Admin', fg: C.red, bg: C.redLight };
  }

  if (!product.isActive) {
    return { label: 'Removed by seller', fg: C.mutedText, bg: '#EEEEF2' };
  }

  return { label: 'Unavailable', fg: C.yellow, bg: C.yellowLight };
};

const sellerName = (product: AdminProduct) =>
  [product.seller?.firstName, product.seller?.lastName].filter(Boolean).join(' ') ||
  product.seller?.email ||
  'Unknown seller';

const listOrDash = (values?: string[] | null) =>
  values && values.length ? values.join(', ') : '—';

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const desktop = useDesktopWeb();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [shops, setShops] = useState<AdminProductShop[]>([]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AdminProductStatusFilter>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [saving, setSaving] = useState(false);

  /*
   * Ignore responses from older requests when filters
   * change quickly.
   */
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;

    try {
      setError(null);

      const data = await getAdminProducts({
        search: debouncedSearch,
        florist: shopFilter,
        status: statusFilter,
      });

      if (id !== requestId.current) {
        return;
      }

      setProducts(data.flowers);
      setTotal(data.total);
      setShops(data.shops);
    } catch (loadError) {
      if (id !== requestId.current) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Seller listings could not be loaded.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, shopFilter, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /*
   * Show 5 listings + "See all"; collapses when a filter
   * changes.
   */
  const seeAll = useSeeAll(products, {
    resetKey: `${statusFilter}|${shopFilter}|${debouncedSearch.toLowerCase()}`,
  });

  const openProduct = (product: AdminProduct) => {
    setHideReason('');
    setSelected(product);
  };

  const applyUpdate = (updated: AdminProduct) => {
    const merged = { ...selected, ...updated } as AdminProduct;

    setSelected(merged);

    /*
     * Drop it from the list when it no longer matches the
     * Visible / Hidden filter.
     */
    setProducts(current =>
      current
        .map(item => (item._id === merged._id ? { ...item, ...merged } : item))
        .filter(item =>
          statusFilter === 'visible'
            ? item.isActive && item.isAvailable
            : statusFilter === 'hidden'
              ? !(item.isActive && item.isAvailable)
              : true
        )
    );
  };

  const toggleVisibility = () => {
    if (!selected) {
      return;
    }

    const hiding = selected.isActive;

    Alert.alert(
      hiding ? 'Hide this listing?' : 'Restore this listing?',
      hiding
        ? `"${selected.name}" will be hidden from customers. The seller will be notified${
            hideReason.trim() ? ' with your reason.' : '.'
          }`
        : `"${selected.name}" will be restored. ${
            selected.isAvailable
              ? 'Customers will see it again.'
              : 'It stays hidden from customers until the seller marks it available.'
          } The seller will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: hiding ? 'Hide Listing' : 'Restore Listing',
          style: hiding ? 'destructive' : 'default',
          onPress: async () => {
            setSaving(true);

            try {
              const updated = await setAdminProductVisibility(
                selected._id,
                !hiding,
                hiding ? hideReason.trim() : undefined
              );

              applyUpdate(updated);
              setHideReason('');
            } catch (saveError) {
              Alert.alert(
                'Unable to Update Listing',
                saveError instanceof Error ? saveError.message : 'Please try again.'
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */
  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.purple}
      />

      <AdminScreenHeader
        title="Products"
        subtitle="Seller listings across FLOGRAM"
      />

      <KeyboardSafeView>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.purpleAccent}
              colors={[C.purpleAccent]}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
        >
          {/* SEARCH */}

          <View style={styles.searchBox}>
            <Ionicons
              name="search"
              size={18}
              color={C.mutedText}
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search listing name..."
              placeholderTextColor={C.mutedText}
              style={styles.searchInput}
              returnKeyType="search"
            />

            {search.length > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={() => setSearch('')}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={C.mutedText}
                />
              </Pressable>
            ) : null}
          </View>

          {/* VISIBILITY */}

          <View style={styles.chipRow}>
            {STATUS_FILTERS.map(item => {
              const active = statusFilter === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setStatusFilter(item.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* SHOP */}

          {shops.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shopRow}
            >
              {[{ _id: 'all', shopName: 'All shops' }, ...shops].map(shop => {
                const active = shopFilter === shop._id;

                return (
                  <Pressable
                    key={shop._id}
                    onPress={() => setShopFilter(shop._id)}
                    style={[styles.shopChip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={13}
                      color={active ? '#FFFFFF' : C.purpleAccent}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {shop.shopName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Listings</Text>
            {!loading && !error ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{total}</Text>
              </View>
            ) : null}
          </View>

          {total > products.length && !loading && !error ? (
            <Text style={styles.note}>
              Showing the newest {products.length} of {total}. Narrow the search or pick a shop to find older listings.
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator
              style={{ marginTop: 30 }}
              size="large"
              color={C.purpleAccent}
            />
          ) : error ? (
            <ErrorState
              role="admin"
              message={error}
              onRetry={() => {
                setLoading(true);
                void load();
              }}
            />
          ) : products.length === 0 ? (
            <EmptyState
              role="admin"
              icon="flower-outline"
              title="No listings found"
              message="No seller listings match your search or filters."
            />
          ) : (
            <>
              <View style={[styles.list, desktop && styles.listDesktop]}>
                {seeAll.visible.map(product => {
                  const status = getListingStatus(product);
                  const image = getFlowerImageUrl(product.images?.[0]);

                  return (
                    <Pressable
                      key={product._id}
                      accessibilityRole="button"
                      onPress={() => openProduct(product)}
                      style={({ pressed }) => [
                        styles.card,
                        desktop && styles.cardDesktop,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      {image ? (
                        <Image
                          source={{ uri: image }}
                          style={styles.thumb}
                        />
                      ) : (
                        <View style={[styles.thumb, styles.thumbEmpty]}>
                          <Ionicons
                            name="flower-outline"
                            size={24}
                            color={C.purpleAccent}
                          />
                        </View>
                      )}

                      <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                          <Text
                            numberOfLines={1}
                            style={styles.cardTitle}
                          >
                            {product.name}
                          </Text>
                          <View style={[styles.pill, { backgroundColor: status.bg }]}>
                            <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
                          </View>
                        </View>

                        <Text
                          numberOfLines={1}
                          style={styles.cardShop}
                        >
                          {product.florist?.shopName || 'Unknown shop'}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={styles.cardMeta}
                        >
                          {product.category || 'Uncategorized'}
                          {product.occasion?.length ? ` · ${product.occasion.slice(0, 3).join(', ')}` : ''}
                          {(product.occasion?.length || 0) > 3 ? ` +${(product.occasion?.length || 0) - 3}` : ''}
                        </Text>

                        <View style={styles.cardBottom}>
                          <Text style={styles.price}>{formatPeso(product.price)}</Text>
                          <Text style={styles.cardMeta}>
                            {product.orderCount ?? 0} order{product.orderCount === 1 ? '' : 's'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <SeeAllButton
                state={seeAll}
                role="admin"
              />
            </>
          )}
        </ScrollView>
      </KeyboardSafeView>

      {/* DETAILS MODAL */}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) {
            setSelected(null);
          }
        }}
      >
        <KeyboardSafeView>
          <View style={styles.overlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (!saving) {
                  setSelected(null);
                }
              }}
            />

            {selected ? (
              <View style={[styles.modal, desktop && styles.modalDesktop]}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalEyebrow}>SELLER LISTING</Text>
                    <Text
                      style={styles.modalTitle}
                      numberOfLines={2}
                    >
                      {selected.name}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.closeButton}
                    disabled={saving}
                    onPress={() => setSelected(null)}
                  >
                    <Ionicons
                      name="close"
                      size={19}
                      color={C.text}
                    />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {selected.images?.length ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.gallery}
                    >
                      {selected.images.map((path, index) => {
                        const uri = getFlowerImageUrl(path);

                        return uri ? (
                          <Image
                            key={`${path}-${index}`}
                            source={{ uri }}
                            style={styles.galleryImage}
                          />
                        ) : null;
                      })}
                    </ScrollView>
                  ) : (
                    <View style={[styles.galleryImage, styles.thumbEmpty, { alignSelf: 'center', marginBottom: 14 }]}>
                      <Ionicons
                        name="image-outline"
                        size={30}
                        color={C.purpleAccent}
                      />
                      <Text style={styles.cardMeta}>No photos</Text>
                    </View>
                  )}

                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPrice}>{formatPeso(selected.price)}</Text>
                    {(() => {
                      const status = getListingStatus(selected);
                      return (
                        <View style={[styles.pill, { backgroundColor: status.bg }]}>
                          <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.infoCard}>
                    <InfoRow
                      label="Shop"
                      value={selected.florist?.shopName || 'Unknown shop'}
                    />
                    <InfoRow
                      label="Seller"
                      value={sellerName(selected)}
                    />
                    {selected.seller?.email ? (
                      <InfoRow
                        label="Seller email"
                        value={selected.seller.email}
                      />
                    ) : null}
                    <InfoRow
                      label="Category"
                      value={selected.category || '—'}
                    />
                    <InfoRow
                      label="Occasions"
                      value={listOrDash(selected.occasion)}
                    />
                    <InfoRow
                      label="Flower types"
                      value={listOrDash(selected.flowerTypes)}
                    />
                    <InfoRow
                      label="Colors"
                      value={listOrDash(selected.colors)}
                    />
                    <InfoRow
                      label="Active"
                      value={selected.isActive ? 'Yes' : selected.hiddenByAdmin ? `No (hidden by Admin${selected.adminHiddenReason ? `: ${selected.adminHiddenReason}` : ''})` : 'No (removed by seller)'}
                    />
                    <InfoRow
                      label="Available"
                      value={selected.isAvailable ? 'Yes' : 'No (seller marked unavailable)'}
                    />
                    <InfoRow
                      label="Orders"
                      value={String(selected.orderCount ?? 0)}
                    />
                    <InfoRow
                      label="Listed"
                      value={formatDate(selected.createdAt)}
                    />
                    <InfoRow
                      label="Last updated"
                      value={formatDate(selected.updatedAt)}
                      last
                    />
                  </View>

                  <Text style={styles.modalSection}>Description</Text>
                  <View style={styles.descriptionCard}>
                    <Text style={styles.description}>{selected.description || 'No description provided.'}</Text>
                  </View>

                  {selected.isActive ? (
                    <>
                      <Text style={styles.modalSection}>Reason for hiding (optional)</Text>
                      <TextInput
                        value={hideReason}
                        onChangeText={setHideReason}
                        placeholder="e.g. Misleading photos or prohibited item"
                        placeholderTextColor={C.mutedText}
                        style={styles.reasonInput}
                        multiline
                        maxLength={300}
                      />
                    </>
                  ) : null}
                </ScrollView>

                {selected.isActive || selected.hiddenByAdmin ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={toggleVisibility}
                  style={({ pressed }) => [
                    styles.actionButton,
                    selected.isActive ? styles.hideButton : styles.restoreButton,
                    pressed && { opacity: 0.85 },
                    saving && { opacity: 0.6 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color={selected.isActive ? C.red : '#FFFFFF'} />
                  ) : (
                    <>
                      <Ionicons
                        name={selected.isActive ? 'eye-off-outline' : 'eye-outline'}
                        size={17}
                        color={selected.isActive ? C.red : '#FFFFFF'}
                      />
                      <Text style={[styles.actionText, { color: selected.isActive ? C.red : '#FFFFFF' }]}>
                        {selected.isActive ? 'Hide from customers' : 'Restore listing'}
                      </Text>
                    </>
                  )}
                </Pressable>
                ) : (
                  <Text style={styles.removedNote}>
                    The seller removed this listing. Only the seller can list it again.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        </KeyboardSafeView>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  removedNote: {
    marginTop: 12,
    textAlign: 'center',
    color: C.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.purpleAccent,
    backgroundColor: C.card,
  },
  chipActive: {
    backgroundColor: C.purpleAccent,
    borderColor: C.purpleAccent,
  },
  chipText: {
    color: C.purpleAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  shopRow: {
    gap: 8,
    paddingTop: 10,
    paddingRight: 8,
  },
  shopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.purpleLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  countBadge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: C.purpleLight,
  },
  countText: {
    color: C.purpleAccent,
    fontSize: 12,
    fontWeight: '800',
  },
  note: {
    marginBottom: 10,
    color: C.secondaryText,
    fontSize: 12,
  },
  list: {
    gap: 10,
    marginBottom: 6,
  },
  listDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  cardDesktop: {
    width: '49%',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: C.purpleLight,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardShop: {
    marginTop: 2,
    color: C.purpleAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 2,
    color: C.secondaryText,
    fontSize: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(20, 20, 40, 0.45)',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    padding: 16,
    borderRadius: 20,
    backgroundColor: C.card,
  },
  modalDesktop: {
    maxWidth: 640,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  modalEyebrow: {
    color: C.purpleAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modalTitle: {
    marginTop: 2,
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
  },
  gallery: {
    gap: 10,
    paddingBottom: 14,
  },
  galleryImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
    backgroundColor: C.purpleLight,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalPrice: {
    color: C.text,
    fontSize: 20,
    fontWeight: '900',
  },
  infoCard: {
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FAFAFC',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoLabel: {
    color: C.secondaryText,
    fontSize: 12,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalSection: {
    marginBottom: 6,
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#FAFAFC',
    marginBottom: 14,
  },
  description: {
    color: C.secondaryText,
    fontSize: 13,
    lineHeight: 19,
  },
  reasonInput: {
    minHeight: 64,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    marginTop: 12,
    borderRadius: 14,
  },
  hideButton: {
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: C.redLight,
  },
  restoreButton: {
    backgroundColor: C.purpleAccent,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
