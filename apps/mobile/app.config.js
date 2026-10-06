/*
 * Extends app.json at build time.
 *
 * GOOGLE_MAPS_API_KEY (an EAS environment variable) is added
 * to the Android build so delivery maps work in the APK.
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
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
