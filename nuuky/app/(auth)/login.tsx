import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { AntDesign, Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { typography, spacing, radius, interactionStates } from "../../lib/theme";
import { useTheme } from "../../hooks/useTheme";
import Constants from "expo-constants";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser } = useAppStore();
  const { theme } = useTheme();

  // Subtle pulse animation for the orb
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Configure Google Sign-In
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
    if (webClientId) {
      GoogleSignin.configure({
        webClientId: webClientId,
        iosClientId: Constants.expoConfig?.extra?.googleIosClientId, // Optional, for iOS
      });
    }

    // Start pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    // Cleanup on unmount
    return () => {
      pulseAnimation.stop();
    };
  }, []);

  const fetchUserProfile = async (userId: string): Promise<{ userData: any; needsOnboarding: boolean } | null> => {
    console.log("[Auth] fetchUserProfile called for userId:", userId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("[Auth] getUser result:", user?.id);

    let { data: userData, error: fetchError } = await supabase.from("users").select("*").eq("id", userId).single();
    console.log("[Auth] Fetched user profile:", userData?.id, "error:", fetchError?.message);

    if (!userData && user) {
      console.log("[Auth] Creating new user profile...");
      // Create profile for OAuth user (fallback if trigger doesn't work)
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: user.email!,
          display_name:
            user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          auth_provider: user.app_metadata?.provider || "google",
          is_online: true,
          profile_completed: false, // New users need onboarding
        })
        .select()
        .single();
      console.log("[Auth] Insert result:", newUser?.id, "error:", insertError?.message);
      userData = newUser;
    }

    if (userData) {
      console.log("[Auth] Setting current user, profile_completed:", userData.profile_completed);
      setCurrentUser(userData);
      return { userData, needsOnboarding: userData.profile_completed === false };
    }
    console.log("[Auth] No user data found, returning null");
    return null;
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      // Prompt Face ID / biometrics before proceeding
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify your identity",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });
        if (!authResult.success) {
          setLoading(false);
          return;
        }
      }

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Not Available", "Sign in with Apple is not available on this device.");
        return;
      }

      // Generate a random nonce (unhashed)
      const randomBytes = Crypto.getRandomBytes(32);
      const randomString = Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

      // Hash the nonce with SHA-256
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        randomString
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      // Use the original unhashed nonce for Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken!,
        nonce: randomString,
      });

      if (error) {
        console.log("[Auth] Apple signInWithIdToken error:", error.message);
        throw error;
      }
      console.log("[Auth] Apple sign in success, user id:", data.user.id);

      // Fetch or create user profile and navigate directly
      const result = await fetchUserProfile(data.user.id);
      console.log("[Auth] fetchUserProfile result:", result);
      if (result) {
        // Navigate directly based on profile completion - avoids race condition with index.tsx
        console.log("[Auth] Navigating to:", result.needsOnboarding ? "onboarding" : "main");
        if (result.needsOnboarding) {
          router.replace("/(auth)/onboarding");
        } else {
          router.replace("/(main)");
        }
      } else {
        console.log("[Auth] No result from fetchUserProfile - this is the problem!");
        Alert.alert("Sign In Error", "Could not fetch user profile. Please try again.");
      }
    } catch (error: any) {
      console.log("[Auth] Apple sign in catch block:", error.code, error.message);
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User cancelled the sign-in
        return;
      }
      Alert.alert("Sign In Failed", error.message || "Failed to sign in with Apple");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        throw new Error("No ID token received from Google");
      }

      // Sign in to Supabase with the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: userInfo.data.idToken,
      });

      if (error) {
        console.log("[Auth] Google signInWithIdToken error:", error.message);
        throw error;
      }
      console.log("[Auth] Google sign in success, user id:", data.user.id);

      // Fetch or create user profile and navigate directly
      const result = await fetchUserProfile(data.user.id);
      console.log("[Auth] fetchUserProfile result:", result);
      if (result) {
        // Navigate directly based on profile completion - avoids race condition with index.tsx
        console.log("[Auth] Navigating to:", result.needsOnboarding ? "onboarding" : "main");
        if (result.needsOnboarding) {
          router.replace("/(auth)/onboarding");
        } else {
          router.replace("/(main)");
        }
      } else {
        console.log("[Auth] No result from fetchUserProfile - this is the problem!");
        Alert.alert("Sign In Error", "Could not fetch user profile. Please try again.");
      }
    } catch (error: any) {
      console.log("[Auth] Google sign in catch block:", error.code, error.message);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in
        return;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign-in is in progress
        Alert.alert("Please wait", "Sign in is already in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services not available or outdated");
      } else {
        Alert.alert("Sign In Failed", error.message || "Failed to sign in with Google");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <LinearGradient colors={theme.gradients.background} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.content}>
          {/* Title - Centered */}
          <View style={styles.header}>
            <Image source={require("../../assets/wordmark.png")} style={styles.wordmark} resizeMode="contain" />
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Feel connected without{"\n"}the pressure of communicating</Text>
          </View>
        </View>

        {/* Auth Buttons - Bottom */}
        <View style={styles.bottomSection}>
          {/* Email Sign-In */}
          <TouchableOpacity
            activeOpacity={interactionStates.pressed}
            onPress={() => router.push("/(auth)/email")}
            disabled={loading}
            style={[styles.emailButton, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.glass.background }]}
          >
            <Feather name="mail" size={20} color={theme.colors.text.primary} />
            <Text style={[styles.emailButtonText, { color: theme.colors.text.primary }]}>Continue with Email</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.glass.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.text.tertiary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.glass.border }]} />
          </View>

          <View style={styles.authButtons}>
            {/* Apple Sign-In */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                activeOpacity={interactionStates.pressed}
                onPress={handleAppleSignIn}
                disabled={loading}
                style={styles.appleButton}
              >
                <AntDesign name="apple" size={20} color="#000" />
                <Text style={styles.appleButtonText}>
                  {loading ? "Signing in..." : "Continue with Apple"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Google Sign-In */}
            <TouchableOpacity
              activeOpacity={interactionStates.pressed}
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={styles.googleButton}
            >
              <AntDesign name="google" size={20} color="#4285F4" />
              <Text style={styles.googleButtonText}>
                {loading ? "Signing in..." : "Continue with Google"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.privacyText, { color: theme.colors.text.tertiary }]}>By continuing, you agree to our terms and privacy policy</Text>
        </View>

        {/* Subtle grain texture overlay */}
        <View style={styles.grain} pointerEvents="none" />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.screenPadding, // Updated: spacing.xl → screenPadding (24px)
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
  },
  wordmark: {
    width: 200,
    height: 80,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size["5xl"],
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.sm,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: typography.size.base,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSection: {
    padding: spacing.screenPadding,
    paddingBottom: spacing["2xl"],
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    // borderColor and backgroundColor set inline via theme
    gap: spacing.sm,
  },
  emailButtonText: {
    fontSize: typography.size.base,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: typography.size.sm,
  },
  authButtons: {
    gap: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  appleButtonText: {
    fontSize: typography.size.base,
    fontWeight: "600" as const,
    color: "#000000",
    letterSpacing: 0.2,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  googleButtonText: {
    fontSize: typography.size.base,
    fontWeight: "600" as const,
    color: "#1F1F1F",
    letterSpacing: 0.2,
  },
  privacyText: {
    fontSize: typography.size.xs,
    textAlign: "center",
    marginTop: spacing.md,
  },
  grain: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    opacity: 0.5,
  },
});
