import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { spacing, radius, typography } from '../../lib/theme';
import { useTheme } from '../../hooks/useTheme';

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  closeButtonText?: string;
  maxHeight?: number | string;
  contentStyle?: ViewStyle;
  blurIntensity?: number;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  showCloseButton = true,
  closeButtonText = 'Cancel',
  maxHeight = '80%',
  contentStyle,
  blurIntensity = 60, // Updated: 80 → 60 for less heavy blur
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <BlurView intensity={blurIntensity} style={styles.overlay} tint="dark">
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        >
          <View
            style={[styles.modalContainer, { maxHeight }]}
            onStartShouldSetResponder={() => true}
          >
            <BlurView intensity={30} style={[styles.modal, { borderColor: theme.colors.glass.border }]}>
              {/* Header */}
              {(title || subtitle) && (
                <View style={[styles.header, { borderBottomColor: theme.colors.glass.border }]}>
                  {title && (
                    <Text style={[styles.title, { color: theme.colors.text.primary }]} accessibilityRole="header">
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>{subtitle}</Text>
                  )}
                </View>
              )}

              {/* Content */}
              <ScrollView
                style={styles.content}
                contentContainerStyle={[styles.contentContainer, contentStyle]}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {children}
              </ScrollView>

              {/* Footer */}
              {(footer || showCloseButton) && (
                <View style={[styles.footer, { borderTopColor: theme.colors.glass.border }]}>
                  {footer}
                  {showCloseButton && !footer && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      accessibilityLabel={closeButtonText}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.closeText, { color: theme.colors.text.tertiary }]}>{closeButtonText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </BlurView>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: spacing.screenPadding, // Updated: spacing.lg → screenPadding (24px)
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    padding: spacing.screenPadding, // Updated: spacing.lg → screenPadding (24px)
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.sm,
  },
  content: {
    maxHeight: 400,
  },
  contentContainer: {
    padding: spacing.screenPadding, // Updated: spacing.lg → screenPadding (24px)
  },
  footer: {
    padding: spacing.screenPadding, // Updated: spacing.lg → screenPadding (24px)
    borderTopWidth: 1,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium as any,
  },
});

export default BaseModal;
