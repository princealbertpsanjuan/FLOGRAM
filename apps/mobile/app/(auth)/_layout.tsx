import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useDesktopWeb } from '../../hooks/use-desktop-web';

/*
 * Phone: plain stack.
 *
 * Desktop web (Admin portal): the sign-in card sits on the
 * right of a branded panel instead of stretching across the
 * whole browser.
 */
export default function AuthLayout() {
  const desktop = useDesktopWeb();

  const stack = <Stack screenOptions={{ headerShown: false }} />;

  if (!desktop) {
    return stack;
  }

  return (
    <View style={styles.row}>
      <View style={styles.brandPanel}>
        <Text style={styles.flower}>🌸</Text>
        <Text style={styles.brand}>FLOGRAM</Text>
        <Text style={styles.title}>Admin Portal</Text>
        <Text style={styles.text}>
          Verify sellers and riders, manage orders, shifts, remittances and payouts, resolve disputes and review
          customer insights.
        </Text>
      </View>

      <View style={styles.formSide}>
        <View style={styles.card}>{stack}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', backgroundColor: '#F5F5F8' },
  brandPanel: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 64,
    backgroundColor: '#24245D',
  },
  flower: { fontSize: 46 },
  brand: { marginTop: 16, color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 6, color: '#C9C8F2', fontSize: 20, fontWeight: '700' },
  text: { marginTop: 18, maxWidth: 440, color: '#B9B8E6', fontSize: 15, lineHeight: 23 },
  formSide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%',
    maxWidth: 460,
    height: '92%',
    maxHeight: 820,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
});
