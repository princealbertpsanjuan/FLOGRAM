// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/*
 * The web build is the Admin portal only.
 * react-native-maps has no web implementation, so web
 * uses a placeholder component instead.
 *
 * Android builds use the native react-native-maps (Google
 * Maps) implementation. The Google Maps API key is added by
 * app.config.js from the GOOGLE_MAPS_API_KEY EAS variable.
 *
 * Safety net: an EAS build WITHOUT that key would crash the
 * moment a map opens (checkout, tracking, rider delivery),
 * so such a build uses the placeholder instead. Expo Go and
 * builds with the key are not affected.
 */
const defaultResolveRequest = config.resolver.resolveRequest;

const mapsKeyMissingOnEas =
  process.env.EAS_BUILD === 'true' && !process.env.GOOGLE_MAPS_API_KEY;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const useStub =
    platform === 'web' || (platform === 'android' && mapsKeyMissingOnEas);

  if (
    useStub &&
    (moduleName === 'react-native-maps' ||
      moduleName.startsWith('react-native-maps/'))
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(
        __dirname,
        'web-shims/react-native-maps.tsx'
      ),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
