import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * =========================================================
 * TERMS AND POLICIES (shared)
 * =========================================================
 *
 * Plain-language summary of the rules the system already
 * enforces. This is a capstone prototype, not a legal
 * document; the final wording should be reviewed before
 * any real launch.
 * =========================================================
 */

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Accounts',
    body: [
      'You are responsible for keeping your login details private and for activity on your account.',
      'Sellers and Riders must pass Admin verification before they can sell or deliver.',
      'Admin may suspend accounts that break these policies.',
    ],
  },
  {
    title: 'Orders and Payments',
    body: [
      'Prices, delivery fees and totals are calculated by FLOGRAM at checkout and shown before you place an order.',
      'Payment options are Cash on Delivery, Cash on Pickup and Online Payment through PayMongo.',
      'An online order is sent to the shop only after PayMongo confirms the payment.',
      'Bouquets are made to order, so a pre-order depends on the shop’s flower availability.',
    ],
  },
  {
    title: 'Cancellations and Refunds',
    body: [
      'Customers may cancel an order while it is waiting for the shop or has just been accepted.',
      'Once preparation starts, the order can no longer be cancelled in the app.',
      'Paid online orders are not cancelled in the app; refunds are handled by FLOGRAM support.',
    ],
  },
  {
    title: 'Delivery',
    body: [
      'Riders accept deliveries only during an Admin-approved work shift.',
      'A Rider uploads a proof-of-delivery photo before a delivery can be completed.',
      'Live Rider location is shared only while a delivery is active.',
    ],
  },
  {
    title: 'Riders: Earnings and COD',
    body: [
      'Rider income is the delivery fee of each completed delivery, paid by Admin per payout period through an external bank transfer with recorded proof.',
      'Cash collected on delivery belongs to FLOGRAM and must be fully remitted with a reference number and proof. It is not Rider income.',
    ],
  },
  {
    title: 'Sellers',
    body: [
      'Sellers must keep product details, prices and availability accurate.',
      'FLOGRAM may deduct a platform commission set by Admin from seller sales.',
    ],
  },
  {
    title: 'Community and Content',
    body: [
      'Posts, comments and images on BloomBoard and Discover must be respectful and must not infringe others’ rights.',
      'Admin may remove content that violates these rules.',
    ],
  },
  {
    title: 'Privacy',
    body: [
      'FLOGRAM collects only the information needed to process orders, deliveries and verification, such as your name, contact details, addresses and uploaded documents.',
      'Your data is used to run the service and is not sold to third parties.',
      'Data handling follows the Philippine Data Privacy Act of 2012 (RA 10173).',
    ],
  },
];

export default function TermsPoliciesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#2D2A2E"
          />
        </Pressable>
        <Text style={styles.title}>Terms and Policies</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {SECTIONS.map(section => (
          <View
            key={section.title}
            style={styles.card}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map(line => (
              <View
                key={line}
                style={styles.bulletRow}
              >
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.text}>{line}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 4, color: '#2D2A2E', fontSize: 19, fontWeight: '800' },
  content: { padding: 16 },
  card: { marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF' },
  sectionTitle: { marginBottom: 8, color: '#2D2A2E', fontSize: 16, fontWeight: '800' },
  bulletRow: { flexDirection: 'row', marginTop: 6 },
  bullet: { width: 16, color: '#8A868B', fontSize: 14, lineHeight: 21 },
  text: { flex: 1, color: '#5E5A5F', fontSize: 14, lineHeight: 21 },
});
