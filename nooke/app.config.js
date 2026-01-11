// Load environment variables from .env file (optional)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed or .env file not found - using fallback values in config
  console.log('Note: .env file not loaded, using fallback values from app.config.js');
}

export default {
  expo: {
    name: "Nooke",
    slug: "nooke",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "nooke",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nooke.app",
      usesAppleSignIn: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.nooke.app",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-apple-authentication"
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ezbamrqoewrbvdvbypyd.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6YmFtcnFvZXdyYnZkdmJ5cHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzgwNDYsImV4cCI6MjA4Mjg1NDA0Nn0.MHznUKhEAI9223Vr3ZlDR2sIy0Sqnvyip5-Gx6jN2R4',
      livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL,
      eas: {
        projectId: "your-eas-project-id"
      }
    }
  }
};
