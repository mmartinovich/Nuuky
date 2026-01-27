import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../stores/appStore";
import { useTheme } from "../../hooks/useTheme";
import { useOTPTimer } from "../../hooks/useOTPTimer";
import { validateEmail, maskEmail, getOTPErrorMessage } from "../../lib/emailUtils";
import { OTPInput } from "../../components/ui";
import { colors, typography, spacing, radius, interactionStates } from "../../lib/theme";

type Step = "email" | "verify";

export default function EmailAuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setCurrentUser } = useAppStore();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { secondsRemaining, canResend, startTimer, formattedTime } = useOTPTimer(60);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate when step changes
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const isEmailValid = validateEmail(email);

  const handleSendOTP = async () => {
    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Disable magic link, force OTP
        },
      });

      if (otpError) throw otpError;

      setStep("verify");
      startTimer();
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(getOTPErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        // Fetch or create user profile
        const result = await fetchUserProfile(data.user.id);
        if (result) {
          if (result.needsOnboarding) {
            router.replace("/(auth)/onboarding");
          } else {
            router.replace("/(main)");
          }
        }
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setError(getOTPErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string): Promise<{ needsOnboarding: boolean } | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    let { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!userData && user) {
      // Create profile for new user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: user.email!,
          display_name: user.email?.split("@")[0] || "User",
          auth_provider: "email",
          is_online: true,
          mood: "neutral",
          profile_completed: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user profile:", insertError);
        Alert.alert("Error", "Failed to create profile. Please try again.");
        return null;
      }
      userData = newUser;
    }

    if (userData) {
      setCurrentUser(userData);
      return { needsOnboarding: userData.profile_completed === false };
    }

    return null;
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    setError(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Disable magic link, force OTP
        },
      });

      if (otpError) throw otpError;

      startTimer();
      setOtp("");
    } catch (err: any) {
      console.error("Error resending OTP:", err);
      setError(getOTPErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "verify") {
      setStep("email");
      setOtp("");
      setError(null);
    } else {
      // Use replace to navigate back to login since we can't always go back
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(auth)/login");
      }
    }
  };

  return (
    <LinearGradient colors={theme.gradients.background as any} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={interactionStates.pressed}
            >
              <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {step === "email" ? (
              <>
                {/* Email Input Step */}
                <View style={styles.titleSection}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                    What's your email?
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                    We'll send you a code to verify your account
                  </Text>
                </View>

                <BlurView
                  intensity={20}
                  tint={theme.colors.blurTint}
                  style={[styles.inputCard, { borderColor: theme.colors.glass.border }]}
                >
                  <Text style={[styles.label, { color: theme.colors.text.secondary }]}>EMAIL</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text.primary,
                        borderColor: error ? "#EF4444" : isEmailValid && email ? "#22C55E" : theme.colors.glass.border,
                        backgroundColor: theme.colors.glass.background,
                      },
                    ]}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.text.tertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </BlurView>

                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={loading || !isEmailValid}
                  style={styles.continueButton}
                  activeOpacity={interactionStates.pressed}
                >
                  <LinearGradient
                    colors={
                      isEmailValid
                        ? (theme.gradients.neonCyan as any)
                        : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
                    }
                    style={[styles.continueGradient, (!isEmailValid || loading) && styles.buttonDisabled]}
                  >
                    <Text style={styles.continueButtonText}>
                      {loading ? "Sending..." : "Send Code"}
                    </Text>
                    <Feather
                      name="arrow-right"
                      size={20}
                      color={isEmailValid ? "#fff" : theme.colors.text.tertiary}
                      style={styles.arrowIcon}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* OTP Verification Step */}
                <View style={styles.titleSection}>
                  <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                    Enter verification code
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                    We sent a 6-digit code to{"\n"}
                    <Text style={{ color: theme.colors.text.primary }}>{maskEmail(email)}</Text>
                  </Text>
                </View>

                <View style={styles.otpSection}>
                  <OTPInput
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setError(null);
                    }}
                    error={!!error}
                    autoFocus
                  />
                  {error && <Text style={[styles.errorText, styles.otpError]}>{error}</Text>}
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  style={styles.continueButton}
                  activeOpacity={interactionStates.pressed}
                >
                  <LinearGradient
                    colors={
                      otp.length === 6
                        ? (theme.gradients.neonCyan as any)
                        : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
                    }
                    style={[styles.continueGradient, (otp.length !== 6 || loading) && styles.buttonDisabled]}
                  >
                    <Text style={styles.continueButtonText}>
                      {loading ? "Verifying..." : "Verify"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Resend Section */}
                <View style={styles.resendSection}>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                      <Text style={[styles.resendText, { color: theme.colors.text.primary }]}>
                        Didn't get the code?{" "}
                        <Text style={styles.resendLink}>Resend</Text>
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.resendText, { color: theme.colors.text.tertiary }]}>
                      Resend code in {formattedTime}
                    </Text>
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Grain texture overlay */}
      <View style={styles.grain} pointerEvents="none" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
  },
  titleSection: {
    marginBottom: spacing["2xl"],
  },
  title: {
    fontSize: typography.size["3xl"],
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.size.base,
    lineHeight: 24,
  },
  inputCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.medium as any,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
  },
  errorText: {
    color: "#EF4444",
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
  },
  otpSection: {
    marginBottom: spacing.lg,
  },
  otpError: {
    textAlign: "center",
    marginTop: spacing.md,
  },
  continueButton: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  continueGradient: {
    padding: spacing.md,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as any,
    color: "#fff",
  },
  arrowIcon: {
    marginLeft: spacing.sm,
  },
  resendSection: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  resendText: {
    fontSize: typography.size.sm,
  },
  resendLink: {
    fontWeight: typography.weight.semibold as any,
    textDecorationLine: "underline",
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
