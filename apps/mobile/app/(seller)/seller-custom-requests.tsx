import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import {
  getMyProposals,
  getSellerCustomRequests,
  requestIdOf,
  sendProposal,
  withdrawProposal,
  type CustomRequest,
  type SellerProposal,
} from '../../services/custom-requests';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * SELLER – CUSTOM BOUQUET REQUESTS
 * =========================================================
 *
 * Open requests from customers. The shop sends one price
 * offer with a short description. The customer compares
 * offers in their AI conversation and picks one; the
 * chosen offer becomes an order at checkout.
 * =========================================================
 */

const GREEN = '#5E9874';
const TEXT = '#2F3A33';
const MUTED = '#6F7A73';
const BORDER = '#E3EAE5';

type Tab = 'open' | 'offers';

const peso = (value?: number | null) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const OFFER_STATUS: Record<SellerProposal['status'], { label: string; color: string }> = {
  submitted: { label: 'Offer sent – waiting for customer', color: '#B7801E' },
  selected: { label: 'Chosen by the customer', color: '#15803D' },
  not_selected: { label: 'Customer chose another shop', color: '#6B7280' },
  withdrawn: { label: 'Withdrawn', color: '#6B7280' },
};

export default function SellerCustomRequestsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const focusId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;

  const [tab, setTab] = useState<Tab>('open');
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [proposals, setProposals] = useState<SellerProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState<string | null>(focusId || null);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [nextRequests, nextProposals] = await Promise.all([getSellerCustomRequests(), getMyProposals()]);
      setRequests(nextRequests);
      setProposals(nextProposals);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load custom requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const proposalByRequest = useMemo(() => {
    const map = new Map<string, SellerProposal>();
    proposals
      .filter(proposal => proposal.status !== 'withdrawn')
      .forEach(proposal => map.set(requestIdOf(proposal), proposal));
    return map;
  }, [proposals]);

  const openRequests = requests.filter(request => request.status === 'open');

  const submit = async (request: CustomRequest) => {
    const quotedPrice = Number(price);

    if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      Alert.alert('Price needed', 'Enter your price for this bouquet.');
      return;
    }

    if (note.trim().length < 5) {
      Alert.alert('Describe your offer', 'Tell the customer what you will make (flowers, size, wrapping).');
      return;
    }

    try {
      setBusy(true);
      await sendProposal(request._id, { quotedPrice, sellerResponse: note.trim() });
      setOpenForm(null);
      setPrice('');
      setNote('');
      await load();
      Alert.alert('Offer sent', 'The customer will be notified and can choose your offer.');
    } catch (submitError) {
      Alert.alert('Could not send offer', submitError instanceof Error ? submitError.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = (proposal: SellerProposal) => {
    Alert.alert('Withdraw offer', 'Remove your offer from this request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await withdrawProposal(proposal._id);
            await load();
          } catch (withdrawError) {
            Alert.alert('Could not withdraw', withdrawError instanceof Error ? withdrawError.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ScreenLoader role="seller" message="Loading custom requests..." />;
  }

  const renderRequest = (request: CustomRequest, proposal?: SellerProposal) => {
    const image = getUploadUrl(request.inspirationImage);
    const details = [
      request.occasion ? ['Occasion', request.occasion] : null,
      request.budget ? ['Budget', peso(request.budget)] : null,
      request.quantity ? ['Quantity', String(request.quantity)] : null,
      request.requestedDate ? ['Needed by', shortDate(request.requestedDate) || ''] : null,
      request.flowerTypes?.length ? ['Flowers', request.flowerTypes.join(', ')] : null,
      request.colors?.length ? ['Colors', request.colors.join(', ')] : null,
      request.bouquetSize ? ['Size', request.bouquetSize] : null,
      request.wrapping ? ['Wrapping', request.wrapping] : null,
      request.theme ? ['Theme', request.theme] : null,
    ].filter(Boolean) as [string, string][];

    const formOpen = openForm === request._id && !proposal && request.status === 'open';

    return (
      <View key={request._id} style={[styles.card, focusId === request._id && { borderColor: GREEN }]}>
        <View style={styles.cardTop}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imageEmpty]}>
              <Ionicons name="flower-outline" size={26} color={GREEN} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{request.occasion ? `${request.occasion} bouquet` : 'Custom bouquet'}</Text>
            <Text style={styles.meta}>
              {[request.customer?.firstName, request.customer?.lastName].filter(Boolean).join(' ') || 'Customer'} ·{' '}
              {shortDate(request.createdAt)}
            </Text>
            {request.budget ? <Text style={styles.budget}>Budget {peso(request.budget)}</Text> : null}
          </View>
        </View>

        {details.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}

        {request.specialInstructions || request.customerMessage ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>“{request.specialInstructions || request.customerMessage}”</Text>
          </View>
        ) : null}

        {proposal ? (
          <View style={styles.offer}>
            <View style={styles.rowBetween}>
              <Text style={styles.offerPrice}>Your offer: {peso(proposal.quotedPrice)}</Text>
              {proposal.status === 'submitted' && request.status === 'open' ? (
                <Pressable onPress={() => withdraw(proposal)}>
                  <Text style={styles.withdraw}>Withdraw</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.offerStatus, { color: OFFER_STATUS[proposal.status].color }]}>
              {OFFER_STATUS[proposal.status].label}
            </Text>
            {proposal.sellerResponse ? <Text style={styles.meta}>{proposal.sellerResponse}</Text> : null}
          </View>
        ) : formOpen ? (
          <View style={styles.form}>
            <Text style={styles.label}>Your price (₱)</Text>
            <TextInput
              value={price}
              onChangeText={value => setPrice(value.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={request.budget ? String(request.budget) : '0.00'}
              placeholderTextColor="#A2ABA5"
              style={styles.input}
            />
            <Text style={styles.label}>What you will make</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={2000}
              placeholder="e.g. 12 red roses with baby's breath, kraft wrap, ready by 3 PM."
              placeholderTextColor="#A2ABA5"
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            />
            <View style={styles.formActions}>
              <Pressable disabled={busy} onPress={() => setOpenForm(null)} style={[styles.button, styles.ghost]}>
                <Text style={[styles.buttonText, { color: GREEN }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void submit(request)}
                style={[styles.button, busy && { opacity: 0.6 }]}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Offer</Text>}
              </Pressable>
            </View>
          </View>
        ) : request.status === 'open' ? (
          <Pressable
            onPress={() => {
              setPrice('');
              setNote('');
              setOpenForm(request._id);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Make an Offer</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const offerRequests = proposals
    .filter(proposal => proposal.status !== 'withdrawn')
    .map(proposal => ({
      proposal,
      request:
        typeof proposal.request === 'object' && proposal.request
          ? proposal.request
          : requests.find(request => request._id === requestIdOf(proposal)),
    }))
    .filter((entry): entry is { proposal: SellerProposal; request: CustomRequest } => Boolean(entry.request));

  return (
    <View style={styles.screen}>
      <ScreenHeader role="seller" title="Custom Requests" subtitle="Send price offers for custom bouquets" />

      <View style={styles.tabs}>
        {(
          [
            ['open', `Open (${openRequests.length})`],
            ['offers', `My Offers (${offerRequests.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === key && { color: '#FFFFFF' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={GREEN}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {error ? (
          <ErrorState role="seller" message={error} onRetry={() => void load()} />
        ) : tab === 'open' ? (
          openRequests.length === 0 ? (
            <EmptyState
              role="seller"
              icon="color-wand-outline"
              title="No open requests"
              message="When a customer asks for a custom bouquet, it shows up here."
            />
          ) : (
            openRequests.map(request => renderRequest(request, proposalByRequest.get(request._id)))
          )
        ) : offerRequests.length === 0 ? (
          <EmptyState role="seller" icon="pricetags-outline" title="No offers yet" message="Offers you send appear here." />
        ) : (
          offerRequests.map(({ request, proposal }) => renderRequest(request, proposal))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: GREEN },
  tabActive: { backgroundColor: GREEN },
  tabText: { color: GREEN, fontSize: 13, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  image: { width: 74, height: 74, borderRadius: 14, backgroundColor: '#EEE' },
  imageEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F2EC' },
  title: { color: TEXT, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  meta: { marginTop: 3, color: MUTED, fontSize: 12, lineHeight: 17 },
  budget: { marginTop: 4, color: GREEN, fontSize: 14, fontWeight: '800' },
  detailRow: { flexDirection: 'row', paddingVertical: 4, gap: 10 },
  detailLabel: { width: 80, color: MUTED, fontSize: 12 },
  detailValue: { flex: 1, color: TEXT, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  message: { marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: '#F6F8F7' },
  messageText: { color: TEXT, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  offer: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#F1F7F3' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerPrice: { color: TEXT, fontSize: 15, fontWeight: '800' },
  offerStatus: { marginTop: 3, fontSize: 12, fontWeight: '800' },
  withdraw: { color: '#C2413B', fontSize: 13, fontWeight: '800' },
  form: { marginTop: 10 },
  label: { marginTop: 10, marginBottom: 6, color: MUTED, fontSize: 13, fontWeight: '700' },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 15,
    backgroundColor: '#FAFCFB',
  },
  formActions: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    height: 46,
    marginTop: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  ghost: { borderWidth: 1.5, borderColor: GREEN, backgroundColor: '#FFFFFF' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
