import { router } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function OnboardingScreenOne() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e',
          }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.overlay} />

          <Pressable
            style={styles.skipButton}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>
              Discover Premium{'\n'}Floral Artistry
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.description}>
            Browse thousands of handcrafted bouquets from certified florists near you.
          </Text>

          <View style={styles.indicatorContainer}>
            <View style={styles.activeIndicator} />
            <View style={styles.inactiveIndicator} />
            <View style={styles.inactiveIndicator} />
          </View>

          <View style={styles.spacer} />

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              router.push('/ai-bouquet');
            }}
          >
            <Text style={styles.continueButtonText}>
              Continue →
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(20, 8, 16, 0.25)',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  skipButton: {
    position: 'absolute',
    top: 22,
    right: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20,
  },

  skipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

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

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
  },

  description: {
    color: '#756B72',
    fontSize: 14,
    lineHeight: 22,
  },

  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    gap: 7,
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

  spacer: {
    flex: 1,
  },

  continueButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#E65A8D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.82,
  },
});