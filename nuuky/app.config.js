// Load environment variables from .env file (optional)
try {
  require("dotenv").config();
} catch (e) {
  // dotenv not installed or .env file not found - environment variables must be set
}

export default {
  expo: {
    name: "Nūūky",
    slug: "nuuky",
    version: "1.0.5",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    scheme: "nuuky",
    splash: {
      image: "./assets/nuuky_splash.png",
      resizeMode: "cover",
      backgroundColor: "#050510",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nuuky.app",
      usesAppleSignIn: true,
      icon: "./assets/icon.png",
      appClips: {
        icon: "./assets/icon.png",
      },
      infoPlist: {
        NSMicrophoneUsageDescription: "Nūūky needs microphone access to let you talk with friends in rooms.",
        NSCameraUsageDescription: "Nūūky needs camera access for video calls with friends.",
        UIBackgroundModes: ["audio"],
        ITSAppUsesNonExemptEncryption: false,
        UIAppFonts: [],
        // Appearance-specific icons for iOS 13+
        CFBundleAlternateIcons: {
          Dark: {
            CFBundleIconFiles: ["icon-dark"],
          },
          Light: {
            CFBundleIconFiles: ["icon-light"],
          },
        },
        // Google Sign-In URL scheme (reversed client ID format)
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["com.googleusercontent.apps.53605023018-3sce2ejdg5ihm53nslbjcmq1896nshdn"],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#050510",
      },
      package: "com.nuuky.app",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-apple-authentication",
      [
        "expo-contacts",
        {
          contactsPermission: "Allow Nūūky to access your contacts to find friends who are already using the app.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Nūūky needs access to your photos so you can set your profile picture.",
          cameraPermission: "Nūūky needs access to your camera so you can take a profile picture.",
        },
      ],
      "@livekit/react-native-expo-plugin",
      "@react-native-google-signin/google-signin",
    ],
    owner: "mmartinovich",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // Optional
      eas: {
        projectId: "3f5531ab-d0f2-44e9-84c2-fd4767070371",
      },
    },
  },
};
