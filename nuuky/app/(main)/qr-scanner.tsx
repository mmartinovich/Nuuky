import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useTheme } from "../../hooks/useTheme";
import { spacing, radius, typography, interactionStates } from "../../lib/theme";

export default function QRScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const overlayFade = useRef(new Animated.Value(0)).current;

  // Request permission on mount if not granted
  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Show permission request screen
  if (!permission?.granted) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={interactionStates.pressed}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.placeholderButton} />
        </View>
        <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={[styles.instruction, { marginTop: spacing.lg }]}>
          Camera access needed
        </Text>
        <Text style={[styles.subInstruction, { marginBottom: spacing.lg }]}>
          Allow camera access to scan QR codes
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show success overlay briefly
  const showSuccessOverlay = () => {
    Animated.sequence([
      Animated.timing(overlayFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(overlayFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Parse the QR data
    const nuukyUrlMatch = data.match(/^nuuky:\/\/(.+)/);
    if (nuukyUrlMatch) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessOverlay();

      // Route through the deep link handler
      setTimeout(() => {
        router.back();
        Linking.openURL(data);
      }, 600);
      return;
    }

    // Not a recognized Nuuky QR code
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      "Not Recognized",
      "This QR code isn't a Nuuky link. Try scanning a Nuuky profile or room invite QR code.",
      [
        {
          text: "Try Again",
          onPress: () => setScanned(false),
        },
        {
          text: "Go Back",
          style: "cancel",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Dark overlay with cutout */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top */}
        <View style={[styles.overlaySection, { flex: 1 }]} />

        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={styles.overlaySection} />
          <View style={styles.scanArea}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom */}
        <View style={[styles.overlaySection, { flex: 1 }]} />
      </View>

      {/* Success overlay */}
      <Animated.View
        style={[
          styles.successOverlay,
          { opacity: overlayFade },
        ]}
        pointerEvents="none"
      >
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={interactionStates.pressed}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan QR Code</Text>

        <View style={styles.placeholderButton} />
      </View>

      {/* Bottom instructions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.footerGradient}
        >
          <Text style={styles.instruction}>
            Point your camera at a Nuuky QR code
          </Text>
          <Text style={styles.subInstruction}>
            Scan a friend's profile or room invite code
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const SCAN_AREA_SIZE = 250;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlaySection: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
  },
  middleRow: {
    flexDirection: "row",
    height: SCAN_AREA_SIZE,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#FFFFFF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: radius.md,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding || 24,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  placeholderButton: {
    width: 44,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    paddingTop: spacing["3xl"],
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  instruction: {
    fontSize: typography.size.lg,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subInstruction: {
    fontSize: typography.size.sm,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radius.lg,
  },
  permissionButtonText: {
    color: "#000000",
    fontSize: typography.size.md,
    fontWeight: "600",
  },
});
