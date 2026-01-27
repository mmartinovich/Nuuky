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
import { colors, spacing, radius, typography, gradients } from '../../lib/theme';

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
            <BlurView intensity={30} style={styles.modal}>
              {/* Header */}
              {(title || subtitle) && (
                <View style={styles.header}>
                  {title && (
                    <Text style={styles.title} accessibilityRole="header">
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text style={styles.subtitle}>{subtitle}</Text>
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
                <View style={styles.footer}>
                  {footer}
                  {showCloseButton && !footer && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      accessibilityLabel={closeButtonText}
                      accessibilityRole="button"
                    >
                      <Text style={styles.closeText}>{closeButtonText}</Text>
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
    borderColor: colors.glass.border,
  },
  header: {
    padding: spacing.screenPadding, // Updated: spacing.lg → screenPadding (24px)
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
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
    borderTopColor: colors.glass.border,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium as any,
  },
});

export default BaseModal;
