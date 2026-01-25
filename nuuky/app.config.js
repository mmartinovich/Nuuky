// Load environment variables from .env file (optional)
try {
  require("dotenv").config();
} catch (e) {
  // dotenv not installed or .env file not found - using fallback values in config
  console.log("Note: .env file not loaded, using fallback values from app.config.js");
}

export default {
  expo: {
    name: "Nūūky",
    slug: "nuuky",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    scheme: "nuuky",
    splash: {
      image: "./assets/nuuky_splash.png",
      resizeMode: "contain",
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
      "expo-dev-client",
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
    ],
    owner: "mmartinovich",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ezbamrqoewrbvdvbypyd.supabase.co",
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6YmFtcnFvZXdyYnZkdmJ5cHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzgwNDYsImV4cCI6MjA4Mjg1NDA0Nn0.MHznUKhEAI9223Vr3ZlDR2sIy0Sqnvyip5-Gx6jN2R4",
      livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL,
      eas: {
        projectId: "3f5531ab-d0f2-44e9-84c2-fd4767070371",
      },
    },
  },
};
