import { useEffect, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, usePathname } from 'expo-router';

import { getStoredUser, logout, type AuthUser } from '../../services/auth';
import { getNotifications } from '../../services/notification';

/*
 * =========================================================
 * ADMIN WEB SIDEBAR (desktop browsers)
 * =========================================================
 *
 * Replaces the phone bottom navigation on the web portal
 * with a left sidebar that lists every Admin section.
 * =========================================================
 */

type Link = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SECTIONS: { title: string; links: Link[] }[] = [
  {
    title: 'Overview',
    links: [
      { label: 'Dashboard', route: '/admin-dashboard', icon: 'grid-outline' },
      { label: 'Reports', route: '/admin-reports', icon: 'bar-chart-outline' },
      { label: 'Customer Insights', route: '/admin-insights', icon: 'analytics-outline' },
    ],
  },
  {
    title: 'Management',
    links: [
      { label: 'Users', route: '/admin-users', icon: 'people-outline' },
      { label: 'Orders', route: '/admin-orders', icon: 'receipt-outline' },
      { label: 'Seller Verification', route: '/admin-seller-verification', icon: 'storefront-outline' },
      { label: 'Rider Verification', route: '/admin-rider-verification', icon: 'bicycle-outline' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { label: 'Work Shifts', route: '/admin-rider-shifts', icon: 'calendar-outline' },
      { label: 'COD Remittances', route: '/admin-remittances', icon: 'cash-outline' },
      { label: 'Rider Payouts', route: '/admin-rider-payouts', icon: 'wallet-outline' },
      { label: 'Seller Payouts', route: '/admin-seller-payouts', icon: 'card-outline' },
    ],
  },
  {
    title: 'Trust & Safety',
    links: [
      { label: 'Disputes', route: '/admin-disputes', icon: 'flag-outline' },
      { label: 'Violations', route: '/admin-violations', icon: 'warning-outline' },
    ],
  },
  {
    title: 'System',
    links: [{ label: 'Settings', route: '/admin-settings', icon: 'settings-outline' }],
  },
];

export const SIDEBAR_WIDTH = 248;

export default function AdminWebSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    void getStoredUser().then(setUser);
  }, []);

  useEffect(() => {
    let active = true;

    getNotifications()
      .then(data => {
        if (active) setUnread(Number(data?.unreadCount) || 0);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [pathname]);

  /*
   * Detail pages keep their parent section highlighted.
   */
  const isActive = (route: string) =>
    pathname === route ||
    (route === '/admin-users' && pathname.startsWith('/admin-user-details')) ||
    (route === '/admin-orders' && pathname.startsWith('/admin-order-details')) ||
    (route === '/admin-remittances' && pathname.startsWith('/admin-remittance-details'));

  const signOut = async () => {
    try {
      await logout();
    } finally {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>🌸</Text>
        </View>
        <View>
          <Text style={styles.brandName}>FLOGRAM</Text>
          <Text style={styles.brandTag}>Admin Portal</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.links.map(link => {
              const active = isActive(link.route);

              return (
                <Pressable
                  key={link.route}
                  accessibilityRole="link"
                  onPress={() => router.navigate(`/(admin)${link.route}` as never)}
                  style={({ hovered }: { hovered?: boolean }) => [
                    styles.link,
                    hovered && !active && styles.linkHover,
                    active && styles.linkActive,
                  ]}
                >
                  <Ionicons name={link.icon} size={18} color={active ? '#FFFFFF' : '#B9B8E6'} />
                  <Text style={[styles.linkText, active && styles.linkTextActive]}>{link.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push('/(shared)/notifications' as never)}
          style={({ hovered }: { hovered?: boolean }) => [styles.link, hovered && styles.linkHover]}
        >
          <Ionicons name="notifications-outline" size={18} color="#B9B8E6" />
          <Text style={styles.linkText}>Notifications</Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] || 'A').toUpperCase()}
              {(user?.lastName?.[0] || '').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrator'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || ''}
            </Text>
          </View>
          <Pressable accessibilityLabel="Log out" onPress={() => void signOut()} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color="#B9B8E6" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#1E1E4F',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 22 },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoText: { fontSize: 20 },
  brandName: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  brandTag: { color: '#9C9BD6', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 14 },
  sectionTitle: {
    marginBottom: 6,
    paddingHorizontal: 10,
    color: '#7D7CB8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 2,
    borderRadius: 10,
  },
  linkHover: { backgroundColor: 'rgba(255,255,255,0.06)' },
  linkActive: { backgroundColor: '#5552B9' },
  linkText: { flex: 1, color: '#D6D5F3', fontSize: 14, fontWeight: '600' },
  linkTextActive: { color: '#FFFFFF', fontWeight: '800' },
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5484D',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 6 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5552B9',
  },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  userName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  userEmail: { color: '#9C9BD6', fontSize: 11 },
});
