import { router } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function DeliveryTrackingOnboardingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* =====================================================
            HERO IMAGE
        ===================================================== */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455',
          }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.overlay} />

          {/* SKIP */}
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              router.push('/(auth)/register');
            }}
          >
            <Text style={styles.skipText}>
              Skip
            </Text>
          </Pressable>

          {/* TITLE */}
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>
              Real-Time{'\n'}
              Delivery Tracking
            </Text>
          </View>
        </ImageBackground>

        {/* =====================================================
            CONTENT
        ===================================================== */}
        <View style={styles.content}>
          <Text style={styles.description}>
            Track your flowers live from florist to door with GPS updates and live rider chat.
          </Text>

          {/* PAGE INDICATORS */}
          <View style={styles.indicatorContainer}>
            <View style={styles.inactiveIndicator} />
            <View style={styles.inactiveIndicator} />
            <View style={styles.activeIndicator} />
          </View>

          <View style={styles.spacer} />

          {/* LET'S BLOOM */}
          <Pressable
            style={({ pressed }) => [
              styles.bloomButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              router.push('/(auth)/register');
            }}
          >
            <Text style={styles.bloomButtonText}>
              Let&apos;s Bloom! 🌸
            </Text>
          </Pressable>

          {/* BACK */}
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              router.back();
            }}
          >
            <Text style={styles.backText}>
              ← Back
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  container: {
    flex: 1,
    backgroundColor: '#F7F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  card: {
    width: '100%',
    maxWidth: 390,
    height: '94%',
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    overflow: 'hidden',
    elevation: 7,
  },

  /*
   * =========================================================
   * HERO
   * =========================================================
   */

  hero: {
    height: '48%',
    justifyContent: 'flex-end',
  },

  heroImage: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 18, 0.34)',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  /*
   * =========================================================
   * SKIP
   * =========================================================
   */

  skipButton: {
    position: 'absolute',
    top: 22,
    right: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    borderRadius: 20,
  },

  skipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  /*
   * =========================================================
   * HERO TITLE
   * =========================================================
   */

  heroTextContainer: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
  },

  /*
   * =========================================================
   * BODY
   * =========================================================
   */

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 18,
  },

  description: {
    color: '#756B72',
    fontSize: 14,
    lineHeight: 22,
  },

  /*
   * =========================================================
   * PAGE INDICATORS
   * =========================================================
   */

  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 22,
  },

  activeIndicator: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E45A8A',
  },

  inactiveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F3CCD9',
  },

  /*
   * =========================================================
   * SPACER
   * =========================================================
   */

  spacer: {
    flex: 1,
  },

  /*
   * =========================================================
   * LET'S BLOOM BUTTON
   * =========================================================
   */

  bloomButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#E65A8D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bloomButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /*
   * =========================================================
   * BACK
   * =========================================================
   */

  backButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 6,
  },

  backText: {
    color: '#A59AA0',
    fontSize: 13,
    fontWeight: '500',
  },

  /*
   * =========================================================
   * PRESS EFFECT
   * =========================================================
   */

  pressed: {
    opacity: 0.8,
  },
});