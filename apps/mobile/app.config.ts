import type { ExpoConfig } from 'expo/config';

// TODO(assets): add icon.png, adaptive-icon.png, splash.png in apps/mobile/assets/
//               and re-enable the icon/splash references below.

const config: ExpoConfig = {
  name: 'Plogg It',
  slug: 'plogg-it',
  scheme: 'plogg',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'it.plogg.app',
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Plogg It uses your location to center the map and let you drop pins on trash near you.',
      NSCameraUsageDescription:
        'Plogg It needs the camera so you can attach a photo when reporting trash.',
      NSPhotoLibraryUsageDescription:
        'Plogg It needs photo library access so you can attach a photo when reporting trash.',
    },
  },
  android: {
    package: 'it.plogg.app',
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
    ],
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Plogg It uses your location to center the map and let you drop pins on trash near you.',
      },
    ],
    [
      '@rnmapbox/maps',
      {
        // RNMapboxMapsDownloadToken is a SECRET (sk.*) Mapbox token used only
        // at build time to download the native SDK. Public display uses the
        // `EXPO_PUBLIC_MAPBOX_TOKEN` (pk.*) at runtime.
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
  },
};

export default config;
