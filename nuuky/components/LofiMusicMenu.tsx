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
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../lib/theme';
import { LofiTrack, LOFI_TRACK_METADATA, moodToTrack } from '../lib/lofiMusicPlayer';
import { PresetMood } from '../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_W - 80;

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
      <Ionicons name="volume-low" size={20} color={iconColor} />
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
              marginLeft: -12,
            },
          ]}
        />
      </View>
      <Ionicons name="volume-high" size={20} color={iconColor} />
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

  // Get track info based on current mood (for default option)
  const moodTrack = moodToTrack[currentMood];
  const moodTrackMeta = LOFI_TRACK_METADATA[moodTrack];

  // Get currently displayed track info
  const displayTrack = selectedTrack || moodTrack;
  const displayMeta = LOFI_TRACK_METADATA[displayTrack];

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      setShowDropdown(false);
    } else {
      progress.value = 0;
    }
  }, [visible]);

  const handleClose = () => {
    progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
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
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [
        { scale: 0.3 + p * 0.7 },
      ],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
              activeOpacity={1}
              onPress={handleClose}
            />
          </BlurView>
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            styles.fullScreenContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
            contentStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.glass.background }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Lo-Fi Music
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.tertiary }]}>
            Relaxing beats for your vibe
          </Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Now Playing / Play Button */}
            <View style={styles.section}>
              <View
                style={[
                  styles.nowPlayingCard,
                  {
                    backgroundColor: theme.colors.glass.background,
                    borderColor: isPlaying ? accent.primary : theme.colors.glass.border,
                    borderWidth: isPlaying ? 2 : 1,
                  },
                ]}
              >
                {/* Track indicator */}
                <View style={[styles.trackIndicator, { backgroundColor: displayMeta.moodColor }]} />

                <View style={styles.nowPlayingContent}>
                  <View style={styles.nowPlayingInfo}>
                    <Text style={[styles.nowPlayingLabel, { color: theme.colors.text.tertiary }]}>
                      {isPlaying ? 'NOW PLAYING' : 'SELECTED'}
                    </Text>
                    <Text style={[styles.nowPlayingTrack, { color: theme.colors.text.primary }]}>
                      {displayMeta.label}
                    </Text>
                    <Text style={[styles.nowPlayingDescription, { color: theme.colors.text.tertiary }]}>
                      {displayMeta.description}
                    </Text>
                  </View>

                  {/* Play/Pause Button */}
                  <TouchableOpacity
                    style={[
                      styles.playPauseButton,
                      { backgroundColor: isPlaying ? accent.primary + '20' : accent.primary },
                    ]}
                    onPress={handlePlayPause}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={28}
                      color={isPlaying ? accent.primary : accent.textOnPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Volume Control */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                VOLUME
              </Text>
              <View
                style={[
                  styles.volumeCard,
                  { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                ]}
              >
                <VolumeSlider
                  value={volume}
                  onValueChange={onVolumeChange}
                  accentColor={accent.primary}
                  trackColor={theme.colors.glass.border}
                  iconColor={theme.colors.text.tertiary}
                />
              </View>
            </View>

            {/* Track Selection Dropdown */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                TRACK
              </Text>

              {/* Dropdown Button */}
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
                <View style={[styles.dropdownIndicator, { backgroundColor: displayMeta.moodColor }]} />
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
                <View
                  style={[
                    styles.dropdownList,
                    { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                  ]}
                >
                  {/* Auto (mood-based) option */}
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedTrack === null && { backgroundColor: moodTrackMeta.moodColor + '15' },
                    ]}
                    onPress={() => {
                      handleTrackSelect(null);
                      setShowDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.trackColorDot, { backgroundColor: moodTrackMeta.moodColor }]} />
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
                          isSelected && { backgroundColor: meta.moodColor + '15' },
                        ]}
                        onPress={() => {
                          handleTrackSelect(track);
                          setShowDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.trackColorDot, { backgroundColor: meta.moodColor }]} />
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

            {/* Settings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.tertiary }]}>
                SETTINGS
              </Text>
              <View
                style={[
                  styles.settingsCard,
                  { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                ]}
              >
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                      Auto-play when alone
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.text.tertiary }]}>
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
              </View>
            </View>

            {/* Status Info */}
            {!isAlone && (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border },
                ]}
              >
                <Ionicons name="people" size={18} color={theme.colors.text.tertiary} />
                <Text style={[styles.statusText, { color: theme.colors.text.tertiary }]}>
                  Auto-play pauses when friends are in the room
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullScreenContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  // Now Playing Card
  nowPlayingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  trackIndicator: {
    width: 6,
  },
  nowPlayingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nowPlayingTrack: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  nowPlayingDescription: {
    fontSize: 13,
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Volume Card
  volumeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderContainer: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  dropdownIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  dropdownText: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    marginTop: 1,
  },
  trackColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Settings Card
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    flex: 1,
  },
});
