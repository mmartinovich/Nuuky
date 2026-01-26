import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, interactionStates } from '../../lib/theme';

type SettingsRowType = 'toggle' | 'navigation';

interface SettingsRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  type: SettingsRowType;
  value?: boolean;
  onChange?: (value: boolean) => void;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  type,
  value = false,
  onChange,
  onPress,
  style,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const handlePress = () => {
    if (disabled) return;
    if (type === 'toggle' && onChange) {
      onChange(!value);
    } else if (type === 'navigation' && onPress) {
      onPress();
    }
  };

  const content = (
    <>
      <View style={styles.leftContent}>
        {icon && (
          <Ionicons
            name={icon}
            size={22}
            color={colors.text.secondary}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.label,
            disabled && { opacity: interactionStates.disabled },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.rightContent}>
        {type === 'toggle' ? (
          <Switch
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            trackColor={{
              false: 'rgba(255, 255, 255, 0.1)',
              true: colors.accent?.primary || colors.mood.notGreat.base,
            }}
            thumbColor="#ffffff"
            ios_backgroundColor="rgba(255, 255, 255, 0.1)"
          />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.tertiary}
          />
        )}
      </View>
    </>
  );

  if (type === 'navigation') {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={interactionStates.pressed}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56, // Updated: consistent 56px height
    paddingHorizontal: spacing.md, // 20px
    paddingVertical: spacing.sm, // 8px
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacing.sm + 4, // 12px
  },
  label: {
    fontSize: typography.size.base, // 16px
    fontWeight: typography.weight.medium as any,
    color: colors.text.primary,
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsRow;
