import { useMemo, useState } from 'react';

import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * =========================================================
 * HELP CENTER (shared)
 * =========================================================
 *
 * Open with: /(shared)/help-center?role=customer|seller|rider
 *
 * Answers describe how FLOGRAM actually works today.
 * Customers can also ask the AI Assistant.
 * =========================================================
 */

type Role = 'customer' | 'seller' | 'rider';

type Faq = { q: string; a: string };

const FAQ: Record<Role, Faq[]> = {
  customer: [
    {
      q: 'How do I place an order?',
      a: 'Open a bouquet, add it to your Cart, then tap Checkout. Choose delivery or pickup, your address, and a payment method, then place the order.',
    },
    {
      q: 'What payment methods are available?',
      a: 'Cash on Delivery, Cash on Pickup, and Online Payment through PayMongo. An online order is sent to the shop for acceptance only after PayMongo confirms your payment.',
    },
    {
      q: 'Can I pre-order for a future date?',
      a: 'Yes. Pick a future delivery date at checkout. The shop can accept it right away and starts preparing close to your scheduled date.',
    },
    {
      q: 'How do I track my delivery?',
      a: 'Go to Me → Orders and open the order. Once a Rider picks up your bouquet you can follow the live location on the tracking screen.',
    },
    {
      q: 'Can I cancel my order?',
      a: 'You can cancel while the order is still waiting for the shop or has just been accepted. Paid online orders cannot be cancelled in the app and need a refund through support.',
    },
    {
      q: 'What is BloomBoard?',
      a: 'BloomBoard is where you post a custom bouquet request with your inspiration, budget and occasion. Florists send proposals and you choose the one you like.',
    },
    {
      q: 'How do I rate my order?',
      a: 'After your bouquet is delivered, confirm receipt on the order and leave a rating for the bouquet, the shop and the Rider.',
    },
  ],
  seller: [
    {
      q: 'How do I add a product?',
      a: 'Go to Products → Add Product. Add up to 5 photos using Take Photo or Choose from Gallery, then fill in the name, price, category and occasions.',
    },
    {
      q: 'Why can’t I accept an online order?',
      a: 'Online (PayMongo) orders stay in Awaiting Payment until PayMongo confirms the customer paid. You can accept them as soon as payment is confirmed.',
    },
    {
      q: 'How do I get a Rider for an order?',
      a: 'Accept the order, start preparing it, mark it ready for delivery, then request a Rider. Available Riders on an approved shift will see the request.',
    },
    {
      q: 'Where do I see my sales?',
      a: 'Your sales, order counts and best sellers are in the Reports tab.',
    },
    {
      q: 'How do I update my shop details or address?',
      a: 'Open Profile → Shop Information or Address and tap Edit.',
    },
  ],
  rider: [
    {
      q: 'How do I start receiving deliveries?',
      a: 'Request an Admin-posted work shift from Work Shifts. Once Admin approves it, you can go Online during that shift and accept delivery requests.',
    },
    {
      q: 'Why can’t I go Online?',
      a: 'You can only go Online during an approved work shift. Check Dashboard → Shifts for your next approved shift.',
    },
    {
      q: 'What if my shift ends during a delivery?',
      a: 'You can always finish a delivery you already accepted, even after the shift ends. You just cannot accept new ones.',
    },
    {
      q: 'How am I paid?',
      a: 'You earn the delivery fee of every completed delivery. Admin pays your earnings per payout period by bank transfer and uploads the proof, which you can see in Wallet → Earnings.',
    },
    {
      q: 'What do I do with COD cash?',
      a: 'Cash collected on delivery belongs to FLOGRAM, not to you. Remit the full amount for the day from Wallet → COD Remittance with a reference number and proof.',
    },
    {
      q: 'GPS tracking won’t start',
      a: 'Turn on your phone’s Location, allow FLOGRAM location access, then tap Enable on the delivery screen. If access was denied before, tap Open Settings.',
    },
  ],
};

const isRole = (value: unknown): value is Role =>
  value === 'customer' || value === 'seller' || value === 'rider';

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = isRole(params.role) ? params.role : 'customer';

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = useMemo(() => FAQ[role], [role]);

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
        <Text style={styles.title}>Help Center</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.intro}>
          Answers to common questions. Tap a question to see the answer.
        </Text>

        {faqs.map((item, index) => {
          const open = openIndex === index;

          return (
            <Pressable
              key={item.q}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpenIndex(open ? null : index)}
              style={styles.card}
            >
              <View style={styles.row}>
                <Text style={styles.question}>{item.q}</Text>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#8A868B"
                />
              </View>
              {open ? <Text style={styles.answer}>{item.a}</Text> : null}
            </Pressable>
          );
        })}

        {role === 'customer' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(customer)/customer-ai' as never)}
            style={styles.aiCard}
          >
            <Ionicons
              name="sparkles-outline"
              size={20}
              color="#B2547A"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>Ask the FLOGRAM AI Assistant</Text>
              <Text style={styles.aiText}>
                Get bouquet suggestions and quick answers.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#B2547A"
            />
          </Pressable>
        ) : null}

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.answer}>
            Contact the FLOGRAM Admin through the support email listed in your
            account verification message.
          </Text>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#EEECEF',
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 4, color: '#2D2A2E', fontSize: 19, fontWeight: '800' },
  content: { padding: 16 },
  intro: { marginBottom: 12, color: '#6F6B70', fontSize: 14, lineHeight: 20 },
  card: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  question: { flex: 1, color: '#2D2A2E', fontSize: 15, fontWeight: '700' },
  answer: { marginTop: 8, color: '#5E5A5F', fontSize: 14, lineHeight: 21 },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FCEAF1',
  },
  aiTitle: { color: '#2D2A2E', fontSize: 15, fontWeight: '800' },
  aiText: { marginTop: 2, color: '#6F6B70', fontSize: 13 },
  contact: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF' },
  contactTitle: { color: '#2D2A2E', fontSize: 15, fontWeight: '800' },
});
