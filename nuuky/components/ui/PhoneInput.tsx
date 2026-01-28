import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
} from "react-native";
import { BlurView } from "expo-blur";
import CountryPicker, {
  Country,
  CountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { spacing, radius, typography, interactionStates } from "../../lib/theme";
import {
  formatPhoneDisplay,
  getDialCode,
  getPhonePlaceholder,
  getMaxPhoneLength,
} from "../../lib/phoneUtils";

interface PhoneInputProps {
  /** Raw phone digits (without country code) */
  value: string;
  /** Selected country code */
  countryCode: CountryCode;
  /** Called when phone digits change */
  onChangePhone: (phone: string) => void;
  /** Called when country changes */
  onChangeCountry: (country: CountryCode) => void;
  /** Error message to display */
  error?: string | null;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

/**
 * Phone number input with country code picker
 * Styled to match the Nuuky glassmorphism design system
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  countryCode,
  onChangePhone,
  onChangeCountry,
  error,
  disabled = false,
  autoFocus = false,
}) => {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation for focus state
  const focusAnim = useRef(new Animated.Value(0)).current;

  const dialCode = getDialCode(countryCode);
  const placeholder = getPhonePlaceholder(countryCode);
  const maxLength = getMaxPhoneLength(countryCode);

  const handleSelectCountry = useCallback((country: Country) => {
    onChangeCountry(country.cca2);
    setShowPicker(false);
    // Focus the input after selecting country
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [onChangeCountry]);

  const handlePhoneChange = useCallback((text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, "");
    onChangePhone(digits.slice(0, maxLength));
  }, [onChangePhone, maxLength]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  }, [focusAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  }, [focusAnim]);

  const handleContainerPress = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleCountryPress = useCallback(() => {
    if (!disabled) {
      Keyboard.dismiss();
      setShowPicker(true);
    }
  }, [disabled]);

  // Determine border color based on state
  const getBorderColor = () => {
    if (error) return "#EF4444";
    if (isFocused) return theme.colors.mood.neutral.base;
    if (value.length >= 7) return "#22C55E";
    return theme.colors.glass.border;
  };

  // Animated border color
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? "#EF4444" : value.length >= 7 ? "#22C55E" : theme.colors.glass.border,
      error ? "#EF4444" : theme.colors.mood.neutral.base,
    ],
  });

  // Format the display value
  const displayValue = formatPhoneDisplay(value, countryCode);

  return (
    <BlurView
      intensity={20}
      tint={theme.colors.blurTint}
      style={[
        styles.container,
        { borderColor: getBorderColor() },
      ]}
    >
      {/* Label */}
      <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
        PHONE NUMBER
      </Text>

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Country Picker Button */}
        <TouchableOpacity
          onPress={handleCountryPress}
          disabled={disabled}
          activeOpacity={interactionStates.pressed}
          style={[
            styles.countryButton,
            { backgroundColor: theme.colors.glass.background },
          ]}
        >
          <CountryPicker
            visible={showPicker}
            onClose={() => setShowPicker(false)}
            onSelect={handleSelectCountry}
            countryCode={countryCode}
            withFlag
            withFilter
            withAlphaFilter
            withCallingCode
            withEmoji
            theme={{
              ...DARK_THEME,
              backgroundColor: theme.colors.bg.secondary,
              onBackgroundTextColor: theme.colors.text.primary,
              filterPlaceholderTextColor: theme.colors.text.tertiary,
              primaryColor: theme.colors.mood.neutral.base,
              primaryColorVariant: theme.colors.bg.tertiary,
              activeOpacity: interactionStates.pressed,
              itemHeight: 56,
              flagSize: 24,
            }}
            containerButtonStyle={styles.pickerTrigger}
            filterProps={{
              placeholder: "Search country...",
              placeholderTextColor: theme.colors.text.tertiary,
              style: {
                backgroundColor: theme.colors.glass.background,
                color: theme.colors.text.primary,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: typography.size.base,
              },
            }}
            flatListProps={{
              style: { backgroundColor: theme.colors.bg.secondary },
              contentContainerStyle: { paddingBottom: 40 },
            }}
            modalProps={{
              transparent: true,
              animationType: "slide",
            }}
          />
          <Text style={[styles.dialCode, { color: theme.colors.text.primary }]}>
            {dialCode}
          </Text>
          <Feather
            name="chevron-down"
            size={16}
            color={theme.colors.text.tertiary}
            style={styles.chevron}
          />
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.colors.glass.border }]} />

        {/* Phone Number Input */}
        <TouchableOpacity
          onPress={handleContainerPress}
          activeOpacity={1}
          style={styles.inputWrapper}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.phoneInput,
              {
                color: theme.colors.text.primary,
              },
            ]}
            value={displayValue}
            onChangeText={handlePhoneChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.tertiary}
            keyboardType="phone-pad"
            maxLength={formatPhoneDisplay("9".repeat(maxLength), countryCode).length}
            editable={!disabled}
            autoFocus={autoFocus}
            autoCorrect={false}
            autoComplete="tel"
            textContentType="telephoneNumber"
          />

          {/* Validation indicator */}
          {value.length > 0 && (
            <View style={styles.validationIcon}>
              {value.length >= 7 ? (
                <Feather name="check-circle" size={20} color="#22C55E" />
              ) : (
                <Feather name="phone" size={18} color={theme.colors.text.tertiary} />
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer - Hint or Error */}
      <View style={styles.footer}>
        {error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={12} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.text.tertiary }]}>
            Helps your friends find you on Nuuky
          </Text>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 4,
    borderRadius: radius.md,
    minHeight: 56,
  },
  pickerTrigger: {
    padding: 0,
    marginRight: spacing.xs,
  },
  dialCode: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as any,
    marginLeft: spacing.xs,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  divider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  phoneInput: {
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.medium as any,
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  validationIcon: {
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  footer: {
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: typography.size.xs,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: "#EF4444",
  },
});

export default PhoneInput;
