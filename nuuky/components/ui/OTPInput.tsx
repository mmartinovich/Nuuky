import React, { useRef, useEffect } from "react";
import { View, TextInput, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../../hooks/useTheme";
import { spacing, radius, typography } from "../../lib/theme";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
  disabled?: boolean;
}

/**
 * 6-digit OTP input component with individual boxes
 * Features: auto-advance, backspace navigation, paste support
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  autoFocus = true,
  error = false,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Split value into array of digits
  const digits = value.split("").slice(0, length);
  while (digits.length < length) {
    digits.push("");
  }

  // Focus first empty input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    // Handle paste (full OTP pasted)
    if (text.length > 1) {
      const pastedValue = text.replace(/\D/g, "").slice(0, length);
      onChange(pastedValue);
      // Focus last filled or last input
      const focusIndex = Math.min(pastedValue.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    // Single digit input
    const digit = text.replace(/\D/g, "");
    const newDigits = [...digits];
    newDigits[index] = digit;
    onChange(newDigits.join(""));

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace - go to previous input
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select the text when focused
    inputRefs.current[index]?.setSelection(0, 1);
  };

  const getBorderColor = (index: number) => {
    if (error) return "#EF4444";
    if (digits[index]) return "#22C55E";
    return theme.colors.glass.border;
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => (
        <Pressable
          key={index}
          onPress={() => inputRefs.current[index]?.focus()}
          style={styles.inputWrapper}
        >
          <BlurView
            intensity={20}
            tint={theme.colors.blurTint}
            style={[
              styles.inputContainer,
              {
                borderColor: getBorderColor(index),
                backgroundColor: theme.colors.glass.background,
              },
            ]}
          >
            <TextInput
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.input,
                { color: theme.colors.text.primary },
                error && styles.inputError,
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => handleFocus(index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? length : 1} // Allow paste on first input
              selectTextOnFocus
              editable={!disabled}
              caretHidden={Platform.OS === "ios"}
            />
          </BlurView>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    maxWidth: 52,
  },
  inputContainer: {
    width: "100%",
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.bold as any,
    padding: 0,
  },
  inputError: {
    color: "#EF4444",
  },
});

export default OTPInput;
