/*
 * Extends app.json at build time.
 *
 * GOOGLE_MAPS_API_KEY (an EAS environment variable) is added
 * to the Android build so delivery maps work in the APK.
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    if (process.env.EAS_BUILD === 'true') {
      console.warn(
        '[FLOGRAM] GOOGLE_MAPS_API_KEY is not set for this EAS build. ' +
          'Maps will show a placeholder. Add it with: ' +
          'eas env:create --name GOOGLE_MAPS_API_KEY --environment preview --visibility sensitive'
      );
    }

    return config;
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
