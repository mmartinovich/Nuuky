import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Share, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius, typography, gradients } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";

// Lazy import QRCode to handle cases where the package might not be installed
let QRCodeSVG: any = null;
try {
  QRCodeSVG = require("react-native-qrcode-svg").default;
} catch (e) {
  // Package not installed, will show fallback
}

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
  showCopyButton?: boolean;
  showShareButton?: boolean;
}

/**
 * Displays a QR code with optional title and action buttons
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  title,
  subtitle,
  showCopyButton = true,
  showShareButton = true,
}) => {
  const { theme, accent } = useTheme();
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    setCopying(true);
    try {
      await Share.share({ message: value });
    } catch (error) {
      console.error("Error sharing:", error);
    } finally {
      setTimeout(() => setCopying(false), 1000);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: value,
        url: value,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  if (!QRCodeSVG) {
    // Fallback if QR code package not installed
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.glass.background }]}>
        <View style={[styles.qrPlaceholder, { width: size, height: size }]}>
          <Ionicons name="qr-code-outline" size={size * 0.5} color={theme.colors.text.tertiary} />
          <Text style={[styles.placeholderText, { color: theme.colors.text.tertiary }]}>QR Code</Text>
        </View>
        {title && <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>}
        {subtitle && <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>{subtitle}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>}

      <View style={styles.qrWrapper}>
        <View style={styles.qrBackground}>
          <QRCodeSVG value={value} size={size} color="#000000" backgroundColor="#FFFFFF" />
        </View>
      </View>

      {subtitle && <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>{subtitle}</Text>}

      {(showCopyButton || showShareButton) && (
        <View style={styles.actions}>
          {showCopyButton && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: accent.soft }]}
              onPress={handleCopy}
              disabled={copying}
              activeOpacity={0.7}
            >
              {copying ? (
                <Ionicons name="checkmark" size={20} color={accent.primary} />
              ) : (
                <Ionicons name="copy-outline" size={20} color={accent.primary} />
              )}
              <Text style={[styles.actionText, { color: accent.primary }]}>{copying ? "Copied!" : "Copy"}</Text>
            </TouchableOpacity>
          )}

          {showShareButton && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: accent.soft }]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={20} color={accent.primary} />
              <Text style={[styles.actionText, { color: accent.primary }]}>Share</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

interface QRCodeModalProps {
  visible: boolean;
  value: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

/**
 * Full-screen modal for displaying a QR code
 */
export const QRCodeModal: React.FC<QRCodeModalProps> = ({ visible, value, title, subtitle, onClose }) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title || "QR Code"}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            <View style={styles.content}>
              <QRCodeDisplay value={value} size={250} subtitle={subtitle} />
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: spacing.md,
  },
  qrWrapper: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  qrBackground: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  qrPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.size.sm,
    marginTop: spacing.md,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  actionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
  },
  // Modal styles
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  modal: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as any,
    color: colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  content: {
    alignItems: "center",
  },
});
