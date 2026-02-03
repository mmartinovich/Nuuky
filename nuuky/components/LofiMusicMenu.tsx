import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../lib/theme';
import { LofiTrack, LOFI_TRACK_METADATA, moodToTrack } from '../lib/lofiMusicPlayer';
import { PresetMood } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_W - 120;

// Custom volume slider component
interface VolumeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  accentColor: string;
  trackColor: string;
  iconColor: string;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
  onValueChange,
  accentColor,
  trackColor,
  iconColor,
}) => {
  const sliderRef = useRef<View>(null);
  const sliderX = useRef(0);

  const handleTouch = (pageX: number) => {
    const newValue = Math.max(0, Math.min(1, (pageX - sliderX.current) / SLIDER_WIDTH));
    onValueChange(newValue);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        sliderRef.current?.measureInWindow((x) => {
          sliderX.current = x;
          handleTouch(evt.nativeEvent.pageX);
        });
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleTouch(evt.nativeEvent.pageX);
      },
    })
  ).current;

  return (
    <View style={styles.volumeRow}>
      <Ionicons name="volume-low" size={18} color={iconColor} />
      <View
        ref={sliderRef}
        style={styles.sliderContainer}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderTrack, { backgroundColor: trackColor }]} />
        <View
          style={[
            styles.sliderFill,
            { backgroundColor: accentColor, width: `${value * 100}%` },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              backgroundColor: accentColor,
              left: `${value * 100}%`,
              marginLeft: -10,
            },
          ]}
        />
      </View>
      <Ionicons name="volume-high" size={18} color={iconColor} />
    </View>
  );
};

// All available tracks for selection
const LOFI_TRACKS: LofiTrack[] = ['good', 'neutral', 'not_great', 'sos'];

interface LofiMusicMenuProps {
  visible: boolean;
  onClose: () => void;
  isPlaying: boolean;
  currentTrack: LofiTrack | null;
  selectedTrack: LofiTrack | null;
  currentMood: PresetMood;
  autoPlayEnabled: boolean;
  volume: number;
  isAlone: boolean;
  onPlay: () => void;
  onPause: () => void;
  onToggleAutoPlay: () => void;
  onVolumeChange: (volume: number) => void;
  onSelectTrack: (track: LofiTrack | null) => void;
}

export const LofiMusicMenu: React.FC<LofiMusicMenuProps> = ({
  visible,
  onClose,
  isPlaying,
  currentTrack,
  selectedTrack,
  currentMood,
  autoPlayEnabled,
  volume,
  isAlone,
  onPlay,
  onPause,
  onToggleAutoPlay,
  onVolumeChange,
  onSelectTrack,
}) => {
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDropdown, setShowDropdown] = useState(false);

  const progress = useSharedValue(0);
  const scale = useSharedValue(0.9);

  // Get track info based on current mood (for default option)
  const moodTrack = moodToTrack[currentMood];
  const moodTrackMeta = LOFI_TRACK_METADATA[moodTrack];

  // Get currently displayed track info
  const displayTrack = selectedTrack || moodTrack;
  const displayMeta = LOFI_TRACK_METADATA[displayTrack];

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      setShowDropdown(false);
    } else {
      progress.value = 0;
      scale.value = 0.9;
    }
  }, [visible]);

  const handleClose = () => {
    progress.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
    scale.value = withTiming(0.9, { duration: 150 });
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleAutoPlayToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleAutoPlay();
  };

  const handleTrackSelect = (track: LofiTrack | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTrack(track);
    setShowDropdown(false);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.6,
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Menu */}
        <Animated.View
          style={[
            styles.menu,
            {
              top: insets.top + 70,
              left: 20,
              backgroundColor: theme.colors.glass.background,
              borderColor: theme.colors.glass.border,
            },
            menuStyle,
          ]}
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
          </BlurView>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons
                name={isPlaying ? 'musical-notes' : 'musical-notes-outline'}
                size={20}
                color={isPlaying ? accent.primary : theme.colors.text.secondary}
              />
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
                Lo-Fi Music
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Track Dropdown */}
          <View style={styles.dropdownSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.tertiary }]}>
              Track
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: theme.colors.glass.background,
                  borderColor: showDropdown ? accent.primary : theme.colors.glass.border,
                },
              ]}
              onPress={() => setShowDropdown(!showDropdown)}
              activeOpacity={0.7}
            >
              <View style={[styles.trackIndicatorSmall, { backgroundColor: displayMeta.moodColor }]} />
              <View style={styles.dropdownText}>
                <Text style={[styles.dropdownLabel, { color: theme.colors.text.primary }]}>
                  {selectedTrack ? displayMeta.label : `${moodTrackMeta.label} (Auto)`}
                </Text>
                <Text style={[styles.dropdownSubtext, { color: theme.colors.text.tertiary }]}>
                  {selectedTrack ? displayMeta.description : 'Based on your mood'}
                </Text>
              </View>
              <Ionicons
                name={showDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.text.tertiary}
              />
            </TouchableOpacity>

            {/* Dropdown Options */}
            {showDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
                {/* Auto (mood-based) option */}
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedTrack === null && { backgroundColor: moodTrackMeta.moodColor + '20' },
                  ]}
                  onPress={() => handleTrackSelect(null)}
                >
                  <View style={[styles.trackIndicatorSmall, { backgroundColor: moodTrackMeta.moodColor }]} />
                  <View style={styles.dropdownItemText}>
                    <Text style={[styles.dropdownItemLabel, { color: theme.colors.text.primary }]}>
                      Auto ({moodTrackMeta.label})
                    </Text>
                    <Text style={[styles.dropdownItemSubtext, { color: theme.colors.text.tertiary }]}>
                      Changes with your mood
                    </Text>
                  </View>
                  {selectedTrack === null && (
                    <Ionicons name="checkmark" size={18} color={moodTrackMeta.moodColor} />
                  )}
                </TouchableOpacity>

                {/* Individual tracks */}
                {LOFI_TRACKS.map((track) => {
                  const meta = LOFI_TRACK_METADATA[track];
                  const isSelected = selectedTrack === track;

                  return (
                    <TouchableOpacity
                      key={track}
                      style={[
                        styles.dropdownItem,
                        isSelected && { backgroundColor: meta.moodColor + '20' },
                      ]}
                      onPress={() => handleTrackSelect(track)}
                    >
                      <View style={[styles.trackIndicatorSmall, { backgroundColor: meta.moodColor }]} />
                      <View style={styles.dropdownItemText}>
                        <Text style={[styles.dropdownItemLabel, { color: theme.colors.text.primary }]}>
                          {meta.label}
                        </Text>
                        <Text style={[styles.dropdownItemSubtext, { color: theme.colors.text.tertiary }]}>
                          {meta.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={meta.moodColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity
            style={[
              styles.playButton,
              {
                backgroundColor: isPlaying ? accent.primary + '20' : accent.primary,
                borderColor: accent.primary,
              },
            ]}
            onPress={handlePlayPause}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={isPlaying ? accent.primary : '#000'}
            />
            <Text
              style={[
                styles.playButtonText,
                { color: isPlaying ? accent.primary : '#000' },
              ]}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          {/* Volume Slider */}
          <VolumeSlider
            value={volume}
            onValueChange={onVolumeChange}
            accentColor={accent.primary}
            trackColor={theme.colors.glass.border}
            iconColor={theme.colors.text.tertiary}
          />

          {/* Auto-play Toggle */}
          <View style={[styles.optionRow, { borderTopColor: theme.colors.glass.border }]}>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionLabel, { color: theme.colors.text.primary }]}>
                Auto-play when alone
              </Text>
              <Text style={[styles.optionDescription, { color: theme.colors.text.tertiary }]}>
                Music starts when you're solo in a room
              </Text>
            </View>
            <Switch
              value={autoPlayEnabled}
              onValueChange={handleAutoPlayToggle}
              trackColor={{ false: theme.colors.glass.border, true: accent.primary + '60' }}
              thumbColor={autoPlayEnabled ? accent.primary : theme.colors.text.secondary}
            />
          </View>

          {/* Status */}
          {!isAlone && (
            <View style={[styles.statusRow, { backgroundColor: theme.colors.glass.background }]}>
              <Ionicons name="people" size={16} color={theme.colors.text.tertiary} />
              <Text style={[styles.statusText, { color: theme.colors.text.tertiary }]}>
                Music pauses when friends are in the room
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    width: SCREEN_W - 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dropdown styles
  dropdownSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  trackIndicatorSmall: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  dropdownText: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  dropdownList: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  optionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 12,
  },
  // Volume slider styles
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
