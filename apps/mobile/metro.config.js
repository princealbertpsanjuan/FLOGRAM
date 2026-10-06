// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/*
 * The web build is the Admin portal only. react-native-maps
 * has no web implementation, so on web it resolves to a
 * small stub (map screens are Customer/Rider mobile screens).
 */
const defaultResolveRequest = config.resolver.resolveRequest;

/*
 * An Android APK built on EAS without GOOGLE_MAPS_API_KEY
 * would crash when a map opens, so that build also uses the
 * stub (a "map unavailable" box). Expo Go is not affected.
 */
const mapsMissingInApk = process.env.EAS_BUILD === 'true' && !process.env.GOOGLE_MAPS_API_KEY;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const useStub = platform === 'web' || (platform === 'android' && mapsMissingInApk);

  if (useStub && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'web-shims/react-native-maps.tsx'),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
