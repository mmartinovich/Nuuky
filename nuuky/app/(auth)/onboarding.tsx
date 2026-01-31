import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Animated,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CountryPicker, { Country, CountryCode, DARK_THEME } from "react-native-country-picker-modal";
import { useAppStore } from "../../stores/appStore";
import { useProfile } from "../../hooks/useProfile";
import { useUsername } from "../../hooks/useUsername";
import { useTheme } from "../../hooks/useTheme";
import { spacing, interactionStates } from "../../lib/theme";
import { validatePhone, formatPhoneDisplay, getDialCode, getPhonePlaceholder, getMaxPhoneLength } from "../../lib/phoneUtils";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentUser } = useAppStore();
  const { loading, pickAndUploadAvatar, updateDisplayName, updatePhone, completeProfile } = useProfile();
  const { checking, validateUsername, checkAvailability, suggestUsername, updateUsername } = useUsername();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(currentUser?.avatar_url || null);
  const [hasManuallyEditedUsername, setHasManuallyEditedUsername] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("US");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Refs
  const availabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Phone formatting helpers
  const dialCode = getDialCode(countryCode);
  const phonePlaceholder = getPhonePlaceholder(countryCode);
  const maxPhoneLength = getMaxPhoneLength(countryCode);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    if (currentUser?.avatar_url) {
      setAvatarUri(currentUser.avatar_url);
    }
  }, [currentUser?.avatar_url]);

  // Handle display name change - auto-populate username letter by letter
  const handleDisplayNameChange = useCallback(
    (text: string) => {
      setDisplayName(text);

      if (!hasManuallyEditedUsername) {
        const suggestion = suggestUsername(text);
        setUsername(suggestion);
        setUsernameAvailable(null);
        setUsernameError(null);

        if (availabilityTimeoutRef.current) {
          clearTimeout(availabilityTimeoutRef.current);
        }

        if (suggestion && suggestion.length >= 3) {
          const validation = validateUsername(suggestion);
          if (!validation.isValid) {
            setUsernameError(validation.error || null);
          } else {
            availabilityTimeoutRef.current = setTimeout(async () => {
              const available = await checkAvailability(suggestion);
              setUsernameAvailable(available);
              if (!available) {
                setUsernameError("Username is already taken");
              }
            }, 500);
          }
        }
      }
    },
    [hasManuallyEditedUsername, suggestUsername, validateUsername, checkAvailability],
  );

  const handleUsernameChange = useCallback(
    (input: string) => {
      setHasManuallyEditedUsername(true);
      const normalized = input.toLowerCase().replace(/[^a-z0-9_]/g, "");
      setUsername(normalized);
      setUsernameAvailable(null);

      if (availabilityTimeoutRef.current) {
        clearTimeout(availabilityTimeoutRef.current);
      }

      const validation = validateUsername(normalized);
      if (!validation.isValid) {
        setUsernameError(validation.error || null);
        return;
      }

      setUsernameError(null);

      availabilityTimeoutRef.current = setTimeout(async () => {
        const available = await checkAvailability(normalized);
        setUsernameAvailable(available);
        if (!available) {
          setUsernameError("Username is already taken");
        }
      }, 500);
    },
    [validateUsername, checkAvailability],
  );

  const handlePhoneChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "");
    setPhoneNumber(digits.slice(0, maxPhoneLength));
  }, [maxPhoneLength]);

  const handleCountrySelect = useCallback((country: Country) => {
    setCountryCode(country.cca2);
    setShowCountryPicker(false);
    setTimeout(() => phoneInputRef.current?.focus(), 100);
  }, []);

  const handleCountryPress = useCallback(() => {
    Keyboard.dismiss();
    setShowCountryPicker(true);
  }, []);

  useEffect(() => {
    return () => {
      if (availabilityTimeoutRef.current) {
        clearTimeout(availabilityTimeoutRef.current);
      }
    };
  }, []);

  const handleAvatarPress = () => {
    if (Platform.OS === "ios") {
      const options = avatarUri
        ? ["Take Photo", "Choose from Library", "Remove Photo", "Cancel"]
        : ["Take Photo", "Choose from Library", "Cancel"];
      const destructiveButtonIndex = avatarUri ? 2 : undefined;
      const cancelButtonIndex = avatarUri ? 3 : 2;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: "Profile Picture",
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            await pickAndUploadAvatar("camera");
          } else if (buttonIndex === 1) {
            await pickAndUploadAvatar("gallery");
          } else if (buttonIndex === 2 && avatarUri) {
            setAvatarUri(null);
          }
        },
      );
    } else {
      const buttons: any[] = [
        { text: "Take Photo", onPress: () => pickAndUploadAvatar("camera") },
        { text: "Choose from Library", onPress: () => pickAndUploadAvatar("gallery") },
      ];

      if (avatarUri) {
        buttons.push({
          text: "Remove Photo",
          style: "destructive",
          onPress: () => setAvatarUri(null),
        });
      }

      buttons.push({ text: "Cancel", style: "cancel" });
      Alert.alert("Profile Picture", "Choose an option", buttons);
    }
  };

  const handleContinue = async () => {
    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedName.length < 1) {
      Alert.alert("Name Required", "Please enter a display name");
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert("Name Too Long", "Display name must be 50 characters or less");
      return;
    }

    const usernameValidation = validateUsername(trimmedUsername);
    if (!usernameValidation.isValid) {
      Alert.alert("Invalid Username", usernameValidation.error || "Please enter a valid username");
      return;
    }

    const phoneValidation = validatePhone(phoneNumber, countryCode);
    if (!phoneValidation.isValid) {
      Alert.alert("Phone Required", phoneValidation.error || "Please enter a valid phone number");
      return;
    }

    if (trimmedName !== currentUser?.display_name) {
      const success = await updateDisplayName(trimmedName);
      if (!success) return;
    }

    if (trimmedUsername !== currentUser?.username) {
      const success = await updateUsername(trimmedUsername);
      if (!success) return;
    }

    const phoneSuccess = await updatePhone(phoneValidation.normalized);
    if (!phoneSuccess) return;

    const completed = await completeProfile();
    if (completed) {
      router.replace("/(main)");
    }
  };

  const displayNameValid = displayName.trim().length >= 1 && displayName.trim().length <= 50;
  const usernameValid = validateUsername(username).isValid && usernameAvailable !== false && !usernameError;
  const phoneValid = phoneNumber.length >= 7;
  const isValid = displayNameValid && usernameValid && phoneValid;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <LinearGradient colors={theme.gradients.background as any} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                Complete Your Profile
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
                Tell us a bit about yourself
              </Text>
            </View>

            {/* Avatar Section - Clean, no glow */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handleAvatarPress}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.avatarWrapper}
                accessibilityLabel="Choose profile photo"
                accessibilityRole="button"
              >
                <View style={styles.avatarContainer}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={["#5856D6", "#AF52DE"]} style={styles.avatarGradient}>
                      <Text style={styles.avatarInitial}>
                        {displayName.trim()[0]?.toUpperCase() || "?"}
                      </Text>
                    </LinearGradient>
                  )}
                </View>

                <View style={[styles.cameraBadge, { backgroundColor: "#007AFF" }]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>

              <Text style={[styles.avatarHint, { color: theme.colors.text.tertiary }]}>
                {avatarUri ? "Tap to change" : "Add Photo (Optional)"}
              </Text>
            </View>

            {/* Display Name Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                DISPLAY NAME
              </Text>
              <View style={styles.sectionContent}>
                <View style={[styles.inputRow, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}>
                  <Ionicons name="person-outline" size={20} color="#FFFFFF" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.colors.text.primary }]}
                    value={displayName}
                    onChangeText={handleDisplayNameChange}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.text.tertiary}
                    maxLength={50}
                    autoFocus
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  <Text style={[styles.charCount, { color: theme.colors.text.tertiary }]}>
                    {displayName.length}/50
                  </Text>
                </View>
              </View>
            </View>

            {/* Username Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                USERNAME
              </Text>
              <View style={styles.sectionContent}>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderWidth: usernameError ? 1 : 0,
                      borderColor: usernameError ? "#EF4444" : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.usernameAt, { color: theme.colors.text.tertiary }]}>@</Text>
                  <TextInput
                    style={[styles.textInput, { color: theme.colors.text.primary }]}
                    value={username}
                    onChangeText={handleUsernameChange}
                    placeholder="username"
                    placeholderTextColor={theme.colors.text.tertiary}
                    maxLength={30}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.statusIcon}>
                    {checking && <ActivityIndicator size="small" color={theme.colors.text.tertiary} />}
                    {!checking && usernameAvailable === true && !usernameError && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    )}
                    {!checking && usernameError && (
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                </View>
              </View>
              <Text style={[styles.sectionFooter, { color: usernameError ? "#EF4444" : theme.colors.text.tertiary }]}>
                {usernameError || "Letters, numbers, and underscores only"}
              </Text>
            </View>

            {/* Phone Number Section - Matching style */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                PHONE NUMBER
              </Text>
              <View style={styles.sectionContent}>
                <View style={[styles.inputRow, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}>
                  {/* Country Picker */}
                  <TouchableOpacity
                    onPress={handleCountryPress}
                    activeOpacity={interactionStates.pressed}
                    style={styles.countryButton}
                  >
                    <CountryPicker
                      visible={showCountryPicker}
                      onClose={() => setShowCountryPicker(false)}
                      onSelect={handleCountrySelect}
                      countryCode={countryCode}
                      withFlag
                      withFilter
                      withCallingCode
                      withEmoji
                      withCloseButton={false}
                      theme={{
                        ...DARK_THEME,
                        backgroundColor: '#0a0a20',
                        onBackgroundTextColor: '#ffffff',
                        filterPlaceholderTextColor: 'rgba(255, 255, 255, 0.35)',
                        primaryColor: '#3FCBFF',
                        primaryColorVariant: '#141428',
                        activeOpacity: interactionStates.pressed,
                        itemHeight: 56,
                        flagSize: 28,
                        fontSize: 16,
                        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
                      }}
                      containerButtonStyle={styles.pickerTrigger}
                      renderCountryFilter={(props: any) => (
                        <View style={pickerStyles.filterContainer}>
                          <View style={pickerStyles.filterRow}>
                            <TouchableOpacity
                              onPress={() => setShowCountryPicker(false)}
                              style={pickerStyles.closeButton}
                              activeOpacity={0.7}
                              accessibilityLabel="Close country picker"
                              accessibilityRole="button"
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                            <View style={pickerStyles.searchInputWrapper}>
                              <Ionicons name="search" size={18} color="rgba(255,255,255,0.35)" style={pickerStyles.searchIcon} />
                              <TextInput
                                {...props}
                                placeholder="Search country..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                autoFocus
                                style={pickerStyles.searchInput}
                              />
                            </View>
                          </View>
                        </View>
                      )}
                      flatListProps={{
                        style: { backgroundColor: '#0a0a20' },
                        contentContainerStyle: { paddingBottom: 60, paddingTop: 4 },
                        showsVerticalScrollIndicator: false,
                      }}
                      modalProps={{
                        transparent: true,
                        animationType: "slide",
                      }}
                    />
                    <Text style={[styles.dialCode, { color: theme.colors.text.primary }]}>
                      {dialCode}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={[styles.phoneDivider, { backgroundColor: theme.colors.glass.border }]} />

                  {/* Phone Input */}
                  <TextInput
                    ref={phoneInputRef}
                    style={[styles.phoneInput, { color: theme.colors.text.primary }]}
                    value={formatPhoneDisplay(phoneNumber, countryCode)}
                    onChangeText={handlePhoneChange}
                    placeholder={phonePlaceholder}
                    placeholderTextColor={theme.colors.text.tertiary}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />

                  {/* Validation Icon */}
                  <View style={styles.statusIcon}>
                    {phoneNumber.length >= 7 && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    )}
                  </View>
                </View>
              </View>
              <Text style={[styles.sectionFooter, { color: theme.colors.text.tertiary }]}>
                Helps your friends find you
              </Text>
            </View>

            {/* Continue Button - White */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                onPress={handleContinue}
                disabled={loading || !isValid}
                activeOpacity={interactionStates.pressed}
                style={[
                  styles.continueButton,
                  {
                    backgroundColor: isValid ? "#FFFFFF" : "rgba(255, 255, 255, 0.1)",
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={isValid ? "#000" : theme.colors.text.tertiary} />
                ) : (
                  <Text style={[styles.continueText, { color: isValid ? "#000" : theme.colors.text.tertiary }]}>
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  // Header
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  // Avatar Section
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: "600",
    color: "#fff",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#050510",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarHint: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  // Section styles
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
    textTransform: "uppercase",
  },
  sectionContent: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionFooter: {
    fontSize: 13,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.41,
    paddingVertical: 14,
  },
  charCount: {
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  usernameAt: {
    fontSize: 17,
    fontWeight: "500",
    marginRight: 2,
  },
  statusIcon: {
    marginLeft: spacing.sm,
    width: 24,
    alignItems: "center",
  },
  // Phone specific
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.sm,
  },
  pickerTrigger: {
    padding: 0,
    marginRight: spacing.xs,
  },
  dialCode: {
    fontSize: 17,
    fontWeight: "500",
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    marginHorizontal: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.41,
    paddingVertical: 14,
  },
  // Button
  buttonSection: {
    marginTop: spacing.lg,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "600",
  },
});

const pickerStyles = StyleSheet.create({
  filterContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.2,
    padding: 0,
  },
});
