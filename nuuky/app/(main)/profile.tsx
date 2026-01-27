import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActionSheetIOS,
  Platform,
  StatusBar,
  Animated,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../stores/appStore";
import { useProfile } from "../../hooks/useProfile";
import { useTheme } from "../../hooks/useTheme";
import { spacing, interactionStates } from "../../lib/theme";
import { QRCodeModal } from "../../components/QRCode";

interface ProfileRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}

const ProfileRow: React.FC<ProfileRowProps> = ({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  isFirst = false,
  isLast = false,
  theme,
}) => {
  const content = (
    <View
      style={[
        styles.rowContainer,
        {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderTopLeftRadius: isFirst ? 16 : 0,
          borderTopRightRadius: isFirst ? 16 : 0,
          borderBottomLeftRadius: isLast ? 16 : 0,
          borderBottomRightRadius: isLast ? 16 : 0,
        },
      ]}
    >
      <View style={styles.rowContent}>
        <Ionicons
          name={icon as any}
          size={22}
          color="#FFFFFF"
          style={styles.rowIcon}
        />
        <Text
          style={[
            styles.rowLabel,
            { color: theme.colors.text.primary },
          ]}
        >
          {label}
        </Text>
        <View style={styles.rowRight}>
          {value && (
            <Text style={[styles.rowValue, { color: theme.colors.text.tertiary }]}>
              {value}
            </Text>
          )}
          {showChevron && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.text.tertiary}
              style={styles.chevron}
            />
          )}
        </View>
      </View>
      {!isLast && (
        <View style={styles.separatorContainer}>
          <View
            style={[styles.separator, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={interactionStates.pressed} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

interface ProfileSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTheme>["theme"];
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, footer, children, theme }) => (
  <View style={styles.section}>
    {title && <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>{title}</Text>}
    <View
      style={[
        styles.sectionContent,
        {
          borderColor: theme.colors.glass.border,
          shadowColor: theme.colors.glass.shadow,
        },
      ]}
    >
      {children}
    </View>
    {footer && <Text style={[styles.sectionFooter, { color: theme.colors.text.tertiary }]}>{footer}</Text>}
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { currentUser } = useAppStore();
  const { loading, previewUri, pickAndUploadAvatar, updateDisplayName, deleteAvatar } = useProfile();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentUser?.display_name || "");
  const [imageKey, setImageKey] = useState(Date.now());
  const [showQRModal, setShowQRModal] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // Sync editedName when currentUser changes
  useEffect(() => {
    if (!isEditingName && currentUser?.display_name) {
      setEditedName(currentUser.display_name);
    }
  }, [currentUser?.display_name, isEditingName]);

  // Force image refresh when avatar URL changes
  useEffect(() => {
    if (currentUser?.avatar_url) {
      setImageKey(Date.now());
    }
  }, [currentUser?.avatar_url]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Loading spinner animation
  useEffect(() => {
    if (loading) {
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [loading]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleAvatarPress = () => {
    if (Platform.OS === "ios") {
      const options = currentUser?.avatar_url
        ? ["Take Photo", "Choose from Library", "Remove Photo", "Cancel"]
        : ["Take Photo", "Choose from Library", "Cancel"];
      const destructiveButtonIndex = currentUser?.avatar_url ? 2 : undefined;
      const cancelButtonIndex = currentUser?.avatar_url ? 3 : 2;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: "Change Profile Photo",
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            await pickAndUploadAvatar("camera");
          } else if (buttonIndex === 1) {
            await pickAndUploadAvatar("gallery");
          } else if (buttonIndex === 2 && currentUser?.avatar_url) {
            await deleteAvatar();
          }
        },
      );
    } else {
      const buttons: any[] = [
        { text: "Take Photo", onPress: () => pickAndUploadAvatar("camera") },
        { text: "Choose from Library", onPress: () => pickAndUploadAvatar("gallery") },
      ];

      if (currentUser?.avatar_url) {
        buttons.push({
          text: "Remove Photo",
          style: "destructive",
          onPress: () => deleteAvatar(),
        });
      }

      buttons.push({ text: "Cancel", style: "cancel" });
      Alert.alert("Change Profile Photo", "", buttons);
    }
  };

  const handleSaveName = async () => {
    if (editedName.trim().length === 0) {
      Alert.alert("Invalid Name", "Display name cannot be empty");
      return;
    }
    const success = await updateDisplayName(editedName.trim());
    if (success) {
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(currentUser?.display_name || "");
    setIsEditingName(false);
  };

  const handleEditName = () => {
    setEditedName(currentUser?.display_name || "");
    setIsEditingName(true);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={theme.gradients.background} style={StyleSheet.absoluteFill} />

      {/* Header - Loóna style (matching rooms header) */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={interactionStates.pressed}
        >
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Profile</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <Animated.View
          style={[
            styles.avatarSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleAvatarPress}
            disabled={loading}
            activeOpacity={0.8}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarContainer}>
              {previewUri ? (
                <Image
                  key={`preview-${previewUri}`}
                  source={{ uri: previewUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : currentUser?.avatar_url ? (
                <Image
                  key={`avatar-${imageKey}`}
                  source={{ uri: currentUser.avatar_url, cache: "reload" }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient colors={["#5856D6", "#AF52DE"]} style={styles.avatarGradient}>
                  <Text style={styles.avatarInitial}>{currentUser?.display_name?.[0]?.toUpperCase() || "?"}</Text>
                </LinearGradient>
              )}

              {/* Loading overlay */}
              {loading && (
                <View style={styles.loadingOverlay}>
                  <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
                    <View style={styles.spinnerContainer}>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="sync" size={28} color="#fff" />
                      </Animated.View>
                    </View>
                  </BlurView>
                </View>
              )}
            </View>

            {/* Camera badge */}
            {!loading && (
              <View style={[styles.cameraBadge, { backgroundColor: "#007AFF" }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
            {currentUser?.display_name || "Your Name"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.text.tertiary }]}>{currentUser?.email || ""}</Text>
        </Animated.View>

        {/* Edit Name Section */}
        {isEditingName ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>DISPLAY NAME</Text>
            <View style={[styles.editCard, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
              <View style={styles.editInputContainer}>
                <TextInput
                  style={[styles.nameInput, { color: theme.colors.text.primary }]}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.text.tertiary}
                  maxLength={50}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
              </View>
              <View style={[styles.editDivider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.editButton} onPress={handleCancelEdit} activeOpacity={interactionStates.pressed}>
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <View style={[styles.buttonDivider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleSaveName}
                  disabled={loading || editedName.trim().length === 0}
                  activeOpacity={interactionStates.pressed}
                >
                  <Text
                    style={[
                      styles.saveButtonText,
                      (loading || editedName.trim().length === 0) && styles.saveButtonDisabled,
                    ]}
                  >
                    {loading ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <ProfileSection title="DISPLAY NAME" footer="This is how your friends will see you in the app." theme={theme}>
            <ProfileRow
              icon="person-outline"
              label="Name"
              value={currentUser?.display_name || "Set your name"}
              onPress={handleEditName}
              isFirst
              isLast
              theme={theme}
            />
          </ProfileSection>
        )}

        {/* Account Info Section */}
        <ProfileSection title="ACCOUNT" theme={theme}>
          {currentUser?.username && (
            <ProfileRow
              icon="at-outline"
              label="Username"
              value={`@${currentUser.username}`}
              showChevron={false}
              isFirst
              isLast={!currentUser?.email && !currentUser?.phone}
              theme={theme}
            />
          )}
          {currentUser?.email && (
            <ProfileRow
              icon="mail-outline"
              label="Email"
              value={currentUser.email}
              showChevron={false}
              isFirst={!currentUser?.username}
              isLast={!currentUser?.phone}
              theme={theme}
            />
          )}
          {currentUser?.phone && (
            <ProfileRow
              icon="call-outline"
              label="Phone"
              value={currentUser.phone}
              showChevron={false}
              isFirst={!currentUser?.username && !currentUser?.email}
              isLast
              theme={theme}
            />
          )}
        </ProfileSection>

        {/* Share Profile Section */}
        {currentUser?.username && (
          <ProfileSection
            title="SHARE PROFILE"
            footer="Friends can add you by scanning your QR code or searching for your username."
            theme={theme}
          >
            <ProfileRow
              icon="qr-code-outline"
              label="My QR Code"
              value="Tap to show"
              onPress={() => setShowQRModal(true)}
              isFirst
              isLast
              theme={theme}
            />
          </ProfileSection>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      {currentUser?.username && (
        <QRCodeModal
          visible={showQRModal}
          value={`nuuky://u/${currentUser.username}`}
          title="My QR Code"
          subtitle={`@${currentUser.username}`}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding || 24,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  // Avatar Section
  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: "600",
    color: "#fff",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    overflow: "hidden",
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#050510",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: "400",
  },
  // Section styles
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: spacing.sm + 4,
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
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionFooter: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
  },
  // Row styles
  rowContainer: {
    minHeight: 56,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "400",
    marginRight: spacing.xs,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  separatorContainer: {
    paddingLeft: 50,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  // Edit name styles
  editCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  editInputContainer: {
    padding: spacing.md,
    paddingVertical: 14,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.41,
    padding: 0,
    minHeight: 24,
  },
  editDivider: {
    height: StyleSheet.hairlineWidth,
  },
  editButtons: {
    flexDirection: "row",
    height: 44,
  },
  editButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDivider: {
    width: StyleSheet.hairlineWidth,
    height: "100%",
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: "400",
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#007AFF",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
});
