// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/*
 * The web build is the Admin portal only.
 * react-native-maps has no web implementation, so web
 * uses a placeholder component instead.
 *
 * Android builds always use the native react-native-maps
 * implementation. The Google Maps API key is configured
 * separately through app.config.js.
 */
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const useStub = platform === 'web';

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