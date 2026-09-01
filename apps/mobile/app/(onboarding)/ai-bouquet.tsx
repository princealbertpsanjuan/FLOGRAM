import { router } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AIBouquetOnboardingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* =====================================================
            HERO IMAGE
        ===================================================== */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946',
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
              AI-Powered Bouquet{'\n'}
              Creator
            </Text>
          </View>
        </ImageBackground>

        {/* =====================================================
            CONTENT
        ===================================================== */}
        <View style={styles.content}>
          <Text style={styles.description}>
            Describe your dream bouquet and our AI creates a personalized arrangement just for you.
          </Text>

          {/* PAGE INDICATORS */}
          <View style={styles.indicatorContainer}>
            <View style={styles.inactiveIndicator} />
            <View style={styles.activeIndicator} />
            <View style={styles.inactiveIndicator} />
          </View>

          <View style={styles.spacer} />

          {/* CONTINUE */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              router.push('/(onboarding)/delivery-tracking');
            }}
          >
            <Text style={styles.continueText}>
              Continue →
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

    backgroundColor:
      'rgba(20, 8, 16, 0.30)',

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

    backgroundColor:
      'rgba(0, 0, 0, 0.38)',

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
   * SPACING
   * =========================================================
   */

  spacer: {
    flex: 1,
  },

  /*
   * =========================================================
   * CONTINUE
   * =========================================================
   */

  continueButton: {
    height: 56,

    backgroundColor: '#E65A8D',

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',
  },

  continueText: {
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