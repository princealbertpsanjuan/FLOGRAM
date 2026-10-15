import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getHomeRouteForUser,
  getSignedInUser,
} from '../services/auth';

/*
 * undefined = still reading the saved session
 * null      = signed out (show Welcome / web login)
 * string    = signed in: that user's home route
 */
type SessionRoute = string | null | undefined;

export default function WelcomeScreen() {
  const [homeRoute, setHomeRoute] =
    useState<SessionRoute>(undefined);

  /*
   * =========================================================
   * SAVED SESSION
   * =========================================================
   *
   * Signing in saves the token + user. On a cold start (or
   * if anything navigates back here) a signed-in user goes
   * straight to their area instead of seeing Welcome,
   * which looked like being logged out.
   *
   * Logout deletes both values, so a signed-out user
   * stays on Welcome.
   * =========================================================
   */
  useEffect(() => {
    let active = true;

    getSignedInUser()
      .then(user => {
        if (!active) {
          return;
        }

        let route = user
          ? getHomeRouteForUser(user)
          : null;

        /*
         * The web build is the Admin portal: only Admin
         * sessions skip the login page there.
         */
        if (
          Platform.OS === 'web' &&
          user?.role !== 'admin'
        ) {
          route = null;
        }

        setHomeRoute(route);
      })
      .catch(() => {
        if (active) {
          setHomeRoute(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (homeRoute === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color="#E9588C"
        />
      </View>
    );
  }

  if (homeRoute) {
    return <Redirect href={homeRoute as never} />;
  }

  /*
   * The web build is the Admin portal: go straight to login.
   */
  if (Platform.OS === 'web') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative background */}
      <View style={styles.topLeftDecoration} />
      <View style={styles.topRightDecoration} />
      <View style={styles.bottomLeftDecoration} />
      <View style={styles.bottomRightDecoration} />

      <View style={styles.content}>
        {/* BRAND AREA */}
        <View style={styles.brandContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🌸</Text>
          </View>

          <Text style={styles.brandName}>
            FLOGRAM
          </Text>

          <Text style={styles.subtitle}>
            AI-Powered Floral Marketplace
          </Text>

          <Text style={styles.tagline}>
            Fresh. Beautiful. Delivered.
          </Text>
        </View>

        {/* ACTION AREA */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => {
              router.push('/(onboarding)');
            }}
          >
            <Text style={styles.getStartedText}>
              Get Started
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => {
              router.push('/(auth)/login');
            }}
          >
            <Text style={styles.signInText}>
              Sign In
            </Text>
          </Pressable>

          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.legalLink}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8FB',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFF8FB',
    overflow: 'hidden',
  },

  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 105,
    paddingBottom: 38,
  },

  /*
   * =====================================================
   * BRAND
   * =====================================================
   */

  brandContainer: {
    alignItems: 'center',
  },

  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  logo: {
    fontSize: 58,
  },

  brandName: {
    color: '#D84F83',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },

  subtitle: {
    color: '#75636B',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },

  tagline: {
    color: '#A18D96',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  /*
   * =====================================================
   * BUTTONS
   * =====================================================
   */

  actionContainer: {
    width: '100%',
  },

  getStartedButton: {
    height: 58,
    backgroundColor: '#E9588C',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,

    elevation: 4,
  },

  getStartedText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  signInButton: {
    height: 58,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9588C',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  signInText: {
    color: '#E9588C',
    fontSize: 17,
    fontWeight: '700',
  },

  pressedButton: {
    opacity: 0.8,
  },

  /*
   * =====================================================
   * LEGAL
   * =====================================================
   */

  legalText: {
    color: '#A28D96',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
  },

  legalLink: {
    color: '#D84F83',
    fontWeight: '600',
  },

  /*
   * =====================================================
   * BACKGROUND DECORATIONS
   * =====================================================
   */

  topLeftDecoration: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#F9E1EA',
    top: -110,
    left: -95,
  },

  topRightDecoration: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FCECF2',
    top: 100,
    right: -75,
  },

  bottomLeftDecoration: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FCECF2',
    bottom: 100,
    left: -85,
  },

  bottomRightDecoration: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#F9E1EA',
    bottom: -130,
    right: -100,
  },
});