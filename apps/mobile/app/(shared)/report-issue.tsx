import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import * as ImagePicker from 'expo-image-picker';

import { router, useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { ROLE_ACCENT, ScreenLoader } from '../../components/ui/state-views';
import { getStoredUser } from '../../services/auth';
import {
  DISPUTE_PARTY_LABELS,
  DISPUTE_REASON_LABELS,
  PARTIES_BY_ROLE,
  REASONS_BY_ROLE,
  fileDispute,
  type DisputeParty,
  type DisputeReason,
} from '../../services/disputes';

/*
 * =========================================================
 * REPORT A PROBLEM (Customer / Seller / Rider)
 * =========================================================
 *
 * Opened from an order: /(shared)/report-issue?orderId=..
 * Sends a dispute to Admin with a reason, details and up
 * to three photos.
 * =========================================================
 */

type PartyRole = 'customer' | 'seller' | 'rider';

const TEXT = '#2D2A2E';
const MUTED = '#6F6A70';
const BORDER = '#E7E3E8';

export default function ReportIssueScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string; productName?: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const productName = Array.isArray(params.productName) ? params.productName[0] : params.productName;

  const [role, setRole] = useState<PartyRole | null>(null);
  const [against, setAgainst] = useState<DisputeParty | null>(null);
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [details, setDetails] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getStoredUser().then(user => {
      const userRole = user?.role;

      if (userRole === 'customer' || userRole === 'seller' || userRole === 'rider') {
        setRole(userRole);
        setAgainst(PARTIES_BY_ROLE[userRole][0]);
      } else {
        router.back();
      }
    });
  }, []);

  if (!role) {
    return <ScreenLoader role="customer" />;
  }

  const accent = ROLE_ACCENT[role];

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(current => [...current, ...result.assets.map(asset => asset.uri)].slice(0, 3));
    }
  };

  const submit = async () => {
    if (!orderId) {
      Alert.alert('Missing order', 'Open this screen from an order.');
      return;
    }

    if (!against || !reason) {
      Alert.alert('Incomplete', 'Choose who the report is about and the reason.');
      return;
    }

    if (details.trim().length < 10) {
      Alert.alert('More details needed', 'Describe what happened in at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const dispute = await fileDispute({ orderId, against, reason, details: details.trim(), imageUris: images });

      Alert.alert('Report sent', 'FLOGRAM Admin will review it. You will get a notification when it is updated.', [
        {
          text: 'View report',
          onPress: () =>
            router.replace({ pathname: '/(shared)/dispute-details', params: { disputeId: dispute._id } } as never),
        },
      ]);
    } catch (error) {
      Alert.alert('Could not send report', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role={role}
        title="Report a Problem"
        subtitle={productName ? `Order: ${productName}` : 'Sent to FLOGRAM Admin'}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>Who is this about?</Text>
          <View style={styles.chips}>
            {PARTIES_BY_ROLE[role].map(party => {
              const active = against === party;
              return (
                <Pressable
                  key={party}
                  onPress={() => setAgainst(party)}
                  style={[styles.chip, { borderColor: accent }, active && { backgroundColor: accent }]}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : accent }]}>
                    {DISPUTE_PARTY_LABELS[party]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Reason</Text>
          <View style={styles.chips}>
            {REASONS_BY_ROLE[role].map(item => {
              const active = reason === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setReason(item)}
                  style={[styles.chip, { borderColor: accent }, active && { backgroundColor: accent }]}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : accent }]}>
                    {DISPUTE_REASON_LABELS[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>What happened?</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Describe the problem, including times and what you expected."
            placeholderTextColor="#A9A3AA"
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <Text style={styles.counter}>{details.length}/2000</Text>

          <Text style={styles.label}>Photos (optional, up to 3)</Text>
          <View style={styles.photos}>
            {images.map(uri => (
              <View key={uri}>
                <Image
                  source={{ uri }}
                  style={styles.photo}
                />
                <Pressable
                  accessibilityLabel="Remove photo"
                  onPress={() => setImages(current => current.filter(item => item !== uri))}
                  style={styles.removePhoto}
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            ))}

            {images.length < 3 ? (
              <Pressable
                onPress={pickImages}
                style={[styles.photo, styles.addPhoto, { borderColor: accent }]}
              >
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={accent}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          disabled={submitting}
          onPress={submit}
          style={[styles.submit, { backgroundColor: accent }, submitting && { opacity: 0.6 }]}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Send Report</Text>}
        </Pressable>

        <Text style={styles.note}>
          False or abusive reports may count as a policy violation. Admin may contact both sides before deciding.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  content: { padding: 16 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  label: { marginTop: 14, marginBottom: 8, color: TEXT, fontSize: 14, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: '#FBFAFB',
  },
  counter: { marginTop: 4, color: MUTED, fontSize: 11, textAlign: 'right' },
  photos: { flexDirection: 'row', gap: 10 },
  photo: { width: 84, height: 84, borderRadius: 12 },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  submit: { height: 52, marginTop: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  note: { marginTop: 12, color: MUTED, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
