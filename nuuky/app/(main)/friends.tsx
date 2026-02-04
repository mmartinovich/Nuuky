import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  SectionListData,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Image as CachedImage } from 'expo-image';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import { useFriends } from "../../hooks/useFriends";
import { useContactSync } from "../../hooks/useContactSync";
import { useInvite } from "../../hooks/useInvite";
import { useStreaks } from "../../hooks/useStreaks";
import { useRoom } from "../../hooks/useRoom";
import { useAppStore } from "../../stores/appStore";
import { useTheme } from "../../hooks/useTheme";
import { spacing, radius, interactionStates } from "../../lib/theme";
import { User, MatchedContact, Friendship } from "../../types";
import { useUserSearch } from "../../hooks/useUserSearch";
import { SwipeableFriendCard } from "../../components/SwipeableFriendCard";
import { PickRoomModal } from "../../components/PickRoomModal";
import { isUserTrulyOnline } from "../../lib/utils";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabMode = 'friends' | 'add';
type SortMode = 'alpha' | 'online' | 'recent';

interface FriendSection {
  title: string;
  data: Friendship[];
  isFavorites?: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Fuzzy match function for typo-tolerant search
const fuzzyMatch = (query: string, text: string): boolean => {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qIndex = 0;
  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) qIndex++;
  }
  return qIndex === q.length;
};

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, accent } = useTheme();
  const sectionListRef = useRef<SectionList<Friendship, FriendSection>>(null);

  const {
    friends,
    loading,
    initialLoading,
    hasLoadedOnce,
    addFriend: addFriendHook,
    removeFriendship,
    refreshFriends,
  } = useFriends();

  const { currentUser, setFriends, favoriteFriends, toggleFavoriteFriend } = useAppStore();
  const { loading: syncLoading, hasSynced, matches, syncContacts } = useContactSync();
  const { sending, shareInvite } = useInvite();
  const { inviteFriendToRoom } = useRoom();
  const { myRooms } = useAppStore();

  const { streaks } = useStreaks();
  const streakMap = useMemo(() => {
    const map = new Map<string, typeof streaks[0]>();
    for (const s of streaks) {
      map.set(s.friend_id, s);
    }
    return map;
  }, [streaks]);

  const { loading: userSearchLoading, results: userSearchResults, searchUsers, clearResults: clearUserSearchResults } = useUserSearch();
  const userSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Tab state with animation
  const [activeTab, setActiveTab] = useState<TabMode>('friends');
  const tabBlobPosition = useSharedValue(0);

  const tabBlobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabBlobPosition.value }],
  }));

  // Alphabet scrubber state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubLetter, setScrubLetter] = useState<string | null>(null);
  const scrubberIndicatorOpacity = useSharedValue(0);
  const scrubberIndicatorScale = useSharedValue(0.5);
  const lastScrubLetter = useRef<string | null>(null);

  const scrubberIndicatorStyle = useAnimatedStyle(() => ({
    opacity: scrubberIndicatorOpacity.value,
    transform: [{ scale: scrubberIndicatorScale.value }],
  }));

  // Friends tab state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [inviteTarget, setInviteTarget] = useState<Friendship | null>(null);

  // Add tab state
  const [usernameQuery, setUsernameQuery] = useState("");
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const [addedContacts, setAddedContacts] = useState<Set<string>>(new Set());
  const [usernameSearchExpanded, setUsernameSearchExpanded] = useState(false);

  // Fuzzy filtered friends
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.trim();
    return friends.filter((f) => {
      const friend = f.friend as User;
      return fuzzyMatch(q, friend.display_name) || fuzzyMatch(q, friend.username || '');
    }).sort((a, b) => {
      const aName = (a.friend as User).display_name.toLowerCase();
      const bName = (b.friend as User).display_name.toLowerCase();
      const qLower = searchQuery.toLowerCase();
      const aStartsWith = aName.startsWith(qLower);
      const bStartsWith = bName.startsWith(qLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return aName.localeCompare(bName);
    });
  }, [friends, searchQuery]);

  // Sorted friends based on sort mode
  const sortedFriends = useMemo(() => {
    const list = [...filteredFriends];
    switch (sortMode) {
      case 'online':
        return list.sort((a, b) => {
          const aOnline = isUserTrulyOnline((a.friend as User).is_online, (a.friend as User).last_seen_at);
          const bOnline = isUserTrulyOnline((b.friend as User).is_online, (b.friend as User).last_seen_at);
          if (aOnline === bOnline) {
            return (a.friend as User).display_name.localeCompare((b.friend as User).display_name);
          }
          return aOnline ? -1 : 1;
        });
      case 'recent':
        return list.sort((a, b) => {
          const aTime = new Date((a.friend as User).last_seen_at || 0).getTime();
          const bTime = new Date((b.friend as User).last_seen_at || 0).getTime();
          return bTime - aTime;
        });
      default:
        return list.sort((a, b) =>
          (a.friend as User).display_name.localeCompare((b.friend as User).display_name)
        );
    }
  }, [filteredFriends, sortMode]);

  // Build sections for SectionList
  const friendsSections = useMemo((): FriendSection[] => {
    const sections: FriendSection[] = [];
    if (!searchQuery.trim()) {
      const favorites = sortedFriends.filter(f => favoriteFriends.includes(f.friend_id));
      if (favorites.length > 0) {
        sections.push({ title: 'FAVORITES', data: favorites, isFavorites: true });
      }
    }
    if (sortMode === 'alpha' && !searchQuery.trim()) {
      const nonFavorites = sortedFriends.filter(f => !favoriteFriends.includes(f.friend_id));
      let currentLetter = '';
      for (const friendship of nonFavorites) {
        const firstLetter = (friendship.friend as User).display_name[0].toUpperCase();
        if (firstLetter !== currentLetter) {
          currentLetter = firstLetter;
          sections.push({ title: firstLetter, data: [] });
        }
        sections[sections.length - 1].data.push(friendship);
      }
    } else {
      const nonFavorites = searchQuery.trim()
        ? sortedFriends
        : sortedFriends.filter(f => !favoriteFriends.includes(f.friend_id));
      if (nonFavorites.length > 0) {
        const title = sortMode === 'online' ? 'BY STATUS' : sortMode === 'recent' ? 'RECENT' : 'ALL FRIENDS';
        sections.push({ title, data: nonFavorites });
      }
    }
    return sections;
  }, [sortedFriends, favoriteFriends, sortMode, searchQuery]);

  // Available letters for alphabet scrubber
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    if (favoriteFriends.length > 0 && friends.some(f => favoriteFriends.includes(f.friend_id))) {
      letters.add('★');
    }
    friends.forEach(f => {
      letters.add((f.friend as User).display_name[0].toUpperCase());
    });
    return letters;
  }, [friends, favoriteFriends]);

  // Contacts on Nūūky who are not yet friends
  const notYetAddedContacts = useMemo(() => {
    if (!hasSynced) return [];
    return matches.onNuuky.filter((contact) => {
      const isAlreadyFriend = addedContacts.has(contact.userId || "") || friends.some((f) => f.friend_id === contact.userId);
      return !isAlreadyFriend;
    });
  }, [hasSynced, matches.onNuuky, addedContacts, friends]);

  // Total found on Nūūky (for messaging)
  const totalFoundOnNuuky = hasSynced ? matches.onNuuky.length : 0;

  useEffect(() => {
    return () => {
      if (userSearchDebounceRef.current) clearTimeout(userSearchDebounceRef.current);
    };
  }, []);

  const [tabWidth, setTabWidth] = useState(0);

  const handleTabChange = (tab: TabMode) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    // Animate blob: 0 for friends (left), tabWidth for add (right)
    tabBlobPosition.value = withSpring(tab === 'friends' ? 0 : tabWidth, {
      damping: 25,
      stiffness: 300,
      mass: 0.8,
    });
  };

  const toggleUsernameSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUsernameSearchExpanded(!usernameSearchExpanded);
    if (usernameSearchExpanded) {
      setUsernameQuery("");
      clearUserSearchResults();
    }
  };

  const handleUsernameSearch = useCallback((text: string) => {
    setUsernameQuery(text);
    if (userSearchDebounceRef.current) clearTimeout(userSearchDebounceRef.current);
    if (text.trim().length < 2) {
      clearUserSearchResults();
      setSearchPending(false);
      return;
    }
    setSearchPending(true);
    userSearchDebounceRef.current = setTimeout(() => {
      setSearchPending(false);
      searchUsers(text);
    }, 300);
  }, [searchUsers, clearUserSearchResults]);

  const handleAddFriendFromSearch = async (userId: string) => {
    setAddingFriendId(userId);
    try {
      await addFriendHook(userId);
    } finally {
      setAddingFriendId(null);
    }
  };

  const isFriend = useCallback(
    (userId: string) => friends.some((f) => f.friend_id === userId),
    [friends]
  );

  const handleAddFromContacts = async (contact: MatchedContact) => {
    if (contact.userId) {
      const success = await addFriendHook(contact.userId);
      if (success) {
        setAddedContacts((prev) => new Set(prev).add(contact.userId!));
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setFriends([]);
    await refreshFriends();
    setRefreshing(false);
  };

  const handleRemoveFriend = useCallback((friendship: Friendship) => {
    const friend = friendship.friend as User;
    removeFriendship(friend.id);
  }, [removeFriendship]);

  const handleToggleFavorite = useCallback((friendId: string) => {
    toggleFavoriteFriend(friendId);
  }, [toggleFavoriteFriend]);

  const handleInviteToRoom = useCallback((friendship: Friendship) => {
    setInviteTarget(friendship);
  }, []);

  const handlePickRoom = useCallback(async (roomId: string) => {
    if (!inviteTarget) return;
    const friend = inviteTarget.friend as User;
    await inviteFriendToRoom(roomId, friend.id);
    setInviteTarget(null);
  }, [inviteTarget, inviteFriendToRoom]);

  const handleLetterPress = useCallback((letter: string) => {
    if (sortMode !== 'alpha' || searchQuery.trim()) return;
    let sectionIndex = -1;
    if (letter === '★') {
      sectionIndex = friendsSections.findIndex(s => s.isFavorites);
    } else {
      sectionIndex = friendsSections.findIndex(s => s.title === letter);
    }
    if (sectionIndex >= 0 && sectionListRef.current) {
      Haptics.selectionAsync();
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [friendsSections, sortMode, searchQuery]);

  // Build scrubber letters array (with star if favorites exist)
  const scrubberLetters = useMemo(() => {
    const letters: string[] = [];
    if (favoriteFriends.length > 0 && friends.some(f => favoriteFriends.includes(f.friend_id))) {
      letters.push('★');
    }
    letters.push(...ALPHABET);
    return letters;
  }, [favoriteFriends, friends]);

  // Scrubber gesture handlers
  const handleScrubStart = useCallback(() => {
    setIsScrubbing(true);
    scrubberIndicatorOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
    scrubberIndicatorScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, []);

  const handleScrubEnd = useCallback(() => {
    setIsScrubbing(false);
    setScrubLetter(null);
    lastScrubLetter.current = null;
    scrubberIndicatorOpacity.value = withTiming(0, { duration: 150 });
    scrubberIndicatorScale.value = withTiming(0.5, { duration: 150 });
  }, []);

  const handleScrubUpdate = useCallback((letter: string) => {
    if (letter !== lastScrubLetter.current) {
      lastScrubLetter.current = letter;
      setScrubLetter(letter);
      Haptics.selectionAsync();
      handleLetterPress(letter);
    }
  }, [handleLetterPress]);

  const scrubberGesture = useMemo(() => {
    const LETTER_HEIGHT = 18;

    return Gesture.Pan()
      .onStart(() => {
        runOnJS(handleScrubStart)();
      })
      .onUpdate((event) => {
        const index = Math.floor(event.y / LETTER_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, scrubberLetters.length - 1));
        const letter = scrubberLetters[clampedIndex];
        if (letter) {
          runOnJS(handleScrubUpdate)(letter);
        }
      })
      .onEnd(() => {
        runOnJS(handleScrubEnd)();
      })
      .onFinalize(() => {
        runOnJS(handleScrubEnd)();
      });
  }, [scrubberLetters, handleScrubStart, handleScrubEnd, handleScrubUpdate]);

  const handleSortChange = (mode: SortMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSortMode(mode);
  };

  const renderFriendItem = useCallback(
    ({ item: friendship }: { item: Friendship }) => (
      <SwipeableFriendCard
        friendship={friendship}
        onPress={() => handleInviteToRoom(friendship)}
        onRemove={handleRemoveFriend}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={favoriteFriends.includes(friendship.friend_id)}
        textPrimaryColor={theme.colors.text.primary}
        streak={streakMap.get(friendship.friend_id)}
      />
    ),
    [handleRemoveFriend, handleInviteToRoom, handleToggleFavorite, favoriteFriends, theme.colors.text.primary, streakMap]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Friendship, FriendSection> }) => (
      <View style={styles.sectionHeaderBar}>
        {section.isFavorites ? (
          <View style={styles.sectionTitleRow}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.sectionHeaderText, { color: '#FFB800' }]}>{section.title}</Text>
          </View>
        ) : (
          <Text style={[styles.sectionHeaderText, { color: theme.colors.text.tertiary }]}>{section.title}</Text>
        )}
      </View>
    ),
    [theme.colors.text.tertiary]
  );

  const keyExtractor = useCallback((item: Friendship) => item.id, []);

  // ============ RENDER ============

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={theme.gradients.background} style={styles.gradient}>

        {/* Fixed Header */}
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={interactionStates.pressed}
            >
              <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Friends</Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: accent.soft }]}
              onPress={handleRefresh}
              activeOpacity={interactionStates.pressed}
            >
              <Ionicons name="refresh" size={24} color={accent.primary} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabContainer, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
            {/* Animated Blob */}
            <Animated.View
              style={[
                styles.tabBlob,
                { backgroundColor: accent.primary, width: tabWidth || '50%' },
                tabBlobStyle,
              ]}
            />

            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange('friends')}
              onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people"
                size={18}
                color={activeTab === 'friends' ? '#000' : theme.colors.text.tertiary}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'friends' ? '#000' : theme.colors.text.tertiary }
              ]}>
                My Friends
              </Text>
              {friends.length > 0 && (
                <View style={[
                  styles.tabBadge,
                  { backgroundColor: activeTab === 'friends' ? 'rgba(0,0,0,0.2)' : accent.soft }
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    { color: activeTab === 'friends' ? '#000' : accent.primary }
                  ]}>
                    {friends.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange('add')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-add"
                size={18}
                color={activeTab === 'add' ? '#000' : theme.colors.text.tertiary}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'add' ? '#000' : theme.colors.text.tertiary }
              ]}>
                Add Friends
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'friends' ? (
          // ============ MY FRIENDS TAB ============
          <>
            <SectionList
              ref={sectionListRef}
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: 8, paddingBottom: insets.bottom + spacing["3xl"] }
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.text.secondary} />
              }
              sections={initialLoading ? [] : friendsSections}
              keyExtractor={keyExtractor}
              renderItem={renderFriendItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={10}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              getItemLayout={(data, index) => ({
                length: 76 + 8,
                offset: (76 + 8) * index,
                index,
              })}
              ListHeaderComponent={
                initialLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.text.secondary} />
                  </View>
                ) : friends.length > 0 ? (
                  <View style={styles.friendsControls}>
                    {/* Search Bar */}
                    <View style={[styles.searchBar, { borderColor: theme.colors.glass.border, backgroundColor: theme.colors.glass.background }]}>
                      <Ionicons name="search" size={18} color={theme.colors.text.tertiary} />
                      <TextInput
                        style={[styles.searchInput, { color: theme.colors.text.primary }]}
                        placeholder="Filter friends..."
                        placeholderTextColor={theme.colors.text.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                          <Ionicons name="close-circle" size={18} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Sort Mode Toggle */}
                    <View style={styles.sortControls}>
                      {(['alpha', 'online', 'recent'] as const).map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.sortButton,
                            { borderColor: theme.colors.glass.border },
                            sortMode === mode && { backgroundColor: accent.primary, borderColor: accent.primary }
                          ]}
                          onPress={() => handleSortChange(mode)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.sortButtonText,
                            { color: sortMode === mode ? '#000' : theme.colors.text.tertiary }
                          ]}>
                            {mode === 'alpha' ? 'A-Z' : mode === 'online' ? 'Online' : 'Recent'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !initialLoading ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: accent.soft }]}>
                      <Ionicons name="people-outline" size={36} color={accent.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No Friends Yet</Text>
                    <Text style={[styles.emptyMessage, { color: theme.colors.text.tertiary }]}>
                      Switch to "Add Friends" tab to find people
                    </Text>
                    <TouchableOpacity
                      style={[styles.emptyButton, { backgroundColor: accent.primary }]}
                      onPress={() => handleTabChange('add')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-add" size={18} color="#000" />
                      <Text style={styles.emptyButtonText}>Add Friends</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />

            {/* Alphabet Scrubber */}
            {sortMode === 'alpha' && friends.length > 5 && !searchQuery.trim() && (
              <>
                {/* Large letter indicator */}
                <Animated.View
                  style={[
                    styles.scrubberIndicator,
                    { backgroundColor: accent.primary },
                    scrubberIndicatorStyle,
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.scrubberIndicatorText}>
                    {scrubLetter || ''}
                  </Text>
                </Animated.View>

                {/* Scrubber strip */}
                <GestureDetector gesture={scrubberGesture}>
                  <View style={[styles.alphabetScrubber, { bottom: insets.bottom + 100 }]}>
                    {scrubberLetters.map(letter => (
                      <TouchableOpacity
                        key={letter}
                        onPress={() => handleLetterPress(letter)}
                        style={styles.letterButton}
                        disabled={letter !== '★' && !availableLetters.has(letter)}
                      >
                        <Text style={[
                          styles.letterText,
                          {
                            color: letter === '★'
                              ? '#FFB800'
                              : availableLetters.has(letter)
                                ? accent.primary
                                : 'rgba(255,255,255,0.2)'
                          }
                        ]}>
                          {letter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </GestureDetector>
              </>
            )}
          </>
        ) : (
          // ============ ADD FRIENDS TAB ============
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.addContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Username Search - Expandable Accordion */}
            <View style={[styles.expandableCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleUsernameSearch}
                style={styles.expandableCardHeader}
              >
                <View style={[styles.addSectionIcon, { backgroundColor: accent.soft }]}>
                  <Ionicons name="at" size={20} color={accent.primary} />
                </View>
                <View style={styles.expandableCardText}>
                  <Text style={[styles.addSectionTitle, { color: theme.colors.text.primary }]}>Find by Username</Text>
                  <Text style={[styles.addSectionSubtitle, { color: theme.colors.text.tertiary }]}>Search anyone on Nūūky</Text>
                </View>
                <Ionicons
                  name={usernameSearchExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.text.tertiary}
                />
              </TouchableOpacity>

              {usernameSearchExpanded && (
                <View style={styles.expandedContent}>
                  <View style={[styles.expandedSeparator, { backgroundColor: theme.colors.glass.border }]} />

                  {/* Search Input */}
                  <View style={[styles.inlineSearchContainer, { borderBottomColor: theme.colors.glass.border }]}>
                    <Ionicons name="search" size={16} color={theme.colors.text.tertiary} />
                    <TextInput
                      style={[styles.inlineSearchInput, { color: theme.colors.text.primary }]}
                      value={usernameQuery}
                      onChangeText={handleUsernameSearch}
                      placeholder="Enter @username..."
                      placeholderTextColor={theme.colors.text.tertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                    {(userSearchLoading || usernameQuery.length > 0) && (
                      <View style={styles.searchTrailingIcon}>
                        {userSearchLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
                        ) : (
                          <TouchableOpacity onPress={() => handleUsernameSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={16} color={theme.colors.text.tertiary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Search Results */}
                  {usernameQuery.length >= 2 && (
                    <>
                      {searchPending || userSearchLoading ? (
                        <View style={styles.inlineLoading}>
                          <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
                        </View>
                      ) : userSearchResults.length > 0 ? (
                        userSearchResults.map((user, index) => {
                          const alreadyFriend = isFriend(user.id);
                          const isAdding = addingFriendId === user.id;
                          const isOnline = isUserTrulyOnline(user.is_online, user.last_seen_at);
                          return (
                            <React.Fragment key={user.id}>
                              {index > 0 && <View style={[styles.inlineRowSeparator, { backgroundColor: theme.colors.glass.border }]} />}
                              <View style={styles.inlineResultRow}>
                                <View style={styles.userResultInfo}>
                                  <View style={styles.userAvatarWrapper}>
                                    {user.avatar_url ? (
                                      <CachedImage
                                        source={{ uri: user.avatar_url }}
                                        style={[styles.userAvatar, { borderColor: theme.colors.glass.border }]}
                                        cachePolicy="memory-disk"
                                        contentFit="cover"
                                      />
                                    ) : (
                                      <View style={[styles.userAvatar, styles.userAvatarPlaceholder, { backgroundColor: accent.soft, borderColor: theme.colors.glass.border }]}>
                                        <Text style={[styles.userAvatarText, { color: accent.primary }]}>
                                          {user.display_name.charAt(0).toUpperCase()}
                                        </Text>
                                      </View>
                                    )}
                                    {isOnline && <View style={[styles.onlineDot, { borderColor: theme.colors.glass.background }]} />}
                                  </View>
                                  <View style={styles.userResultText}>
                                    <Text style={[styles.userResultName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                                      {user.display_name}
                                    </Text>
                                    <Text style={[styles.userResultUsername, { color: theme.colors.text.tertiary }]}>@{user.username}</Text>
                                  </View>
                                </View>
                                {alreadyFriend ? (
                                  <View style={[styles.friendBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                    <Text style={[styles.friendBadgeText, { color: '#22c55e' }]}>Friends</Text>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: accent.primary }]}
                                    onPress={() => handleAddFriendFromSearch(user.id)}
                                    disabled={isAdding}
                                    activeOpacity={0.7}
                                  >
                                    {isAdding ? (
                                      <ActivityIndicator size="small" color="#000" />
                                    ) : (
                                      <>
                                        <Ionicons name="person-add" size={14} color="#000" />
                                        <Text style={styles.addButtonText}>Add</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                )}
                              </View>
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <View style={styles.inlineEmpty}>
                          <Text style={[styles.inlineEmptyText, { color: theme.colors.text.tertiary }]}>No users found</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Find from Contacts - Expandable */}
            <View style={[styles.expandableCard, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={syncContacts}
                disabled={syncLoading}
                style={[styles.expandableCardHeader, syncLoading && styles.buttonDisabled]}
              >
                <View style={[styles.addSectionIcon, { backgroundColor: accent.soft }]}>
                  {syncLoading ? (
                    <ActivityIndicator size="small" color={accent.primary} />
                  ) : (
                    <Ionicons name="people" size={20} color={accent.primary} />
                  )}
                </View>
                <View style={styles.expandableCardText}>
                  <Text style={[styles.addSectionTitle, { color: theme.colors.text.primary }]}>
                    {syncLoading ? "Searching..." : "Find from Contacts"}
                  </Text>
                  <Text style={[styles.addSectionSubtitle, { color: theme.colors.text.tertiary }]}>
                    {hasSynced
                      ? notYetAddedContacts.length > 0
                        ? `${notYetAddedContacts.length} to add`
                        : totalFoundOnNuuky > 0
                          ? "All already friends!"
                          : "No matches found"
                      : "See who's on Nūūky"}
                  </Text>
                </View>
                {notYetAddedContacts.length > 0 ? (
                  <View style={[styles.contactsBadge, { backgroundColor: accent.primary }]}>
                    <Text style={styles.contactsBadgeText}>{notYetAddedContacts.length}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                )}
              </TouchableOpacity>

              {/* Show contacts to add inline */}
              {notYetAddedContacts.length > 0 && (
                <View style={styles.expandedContent}>
                  <View style={[styles.expandedSeparator, { backgroundColor: theme.colors.glass.border }]} />
                  {notYetAddedContacts.map((contact, index) => (
                    <React.Fragment key={contact.id}>
                      {index > 0 && <View style={[styles.inlineRowSeparator, { backgroundColor: theme.colors.glass.border }]} />}
                      <View style={styles.inlineResultRow}>
                        <View style={styles.userResultInfo}>
                          {contact.avatarUrl ? (
                            <CachedImage
                              source={{ uri: contact.avatarUrl }}
                              style={[styles.contactAvatarImage, { borderColor: theme.colors.glass.border }]}
                              cachePolicy="memory-disk"
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[styles.contactAvatar, { backgroundColor: accent.soft }]}>
                              <Ionicons name="person" size={18} color={accent.primary} />
                            </View>
                          )}
                          <View style={styles.userResultText}>
                            <Text style={[styles.userResultName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                              {contact.displayName || contact.name}
                            </Text>
                            <Text style={[styles.userResultUsername, { color: theme.colors.text.tertiary }]}>
                              {contact.name !== contact.displayName ? contact.name : contact.phoneNumbers[0]}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleAddFromContacts(contact)}
                          disabled={loading}
                          style={[styles.addButton, { backgroundColor: accent.primary }]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="person-add" size={14} color="#000" />
                          <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>

            {/* Invite */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => shareInvite()}
              disabled={sending}
              style={[styles.inviteCard, { borderColor: theme.colors.glass.border }]}
            >
              <Ionicons name="share-social-outline" size={20} color={accent.primary} />
              <Text style={[styles.inviteText, { color: theme.colors.text.secondary }]}>
                Know someone not on Nūūky? <Text style={{ color: accent.primary, fontWeight: '600' }}>Send an invite</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </LinearGradient>

      {/* Pick Room to Invite Modal */}
      <PickRoomModal
        visible={inviteTarget !== null}
        rooms={myRooms.filter(r => r.creator_id === currentUser?.id)}
        friendName={inviteTarget ? (inviteTarget.friend as User).display_name : ''}
        onClose={() => setInviteTarget(null)}
        onPick={handlePickRoom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  headerContainer: {
    zIndex: 10,
  },
  header: {
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
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPadding || 24,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    position: 'relative',
  },
  tabBlob: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Scrollable content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingRight: 36,
  },
  addContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
  },
  loadingContainer: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  // Friends Controls
  friendsControls: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
  },
  sortControls: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Section Headers
  sectionHeaderBar: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  // Alphabet Scrubber
  alphabetScrubber: {
    position: 'absolute',
    right: 4,
    top: 180,
    width: 28,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  letterButton: {
    width: 28,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrubberIndicator: {
    position: 'absolute',
    right: 44,
    top: '45%',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  scrubberIndicatorText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  // Add Friends Tab - Expandable Card
  expandableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  expandableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  expandableCardText: {
    flex: 1,
  },
  addSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addSectionSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  expandedContent: {
    maxHeight: 400,
  },
  expandedSeparator: {
    height: 1,
  },
  inlineSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  searchTrailingIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  inlineEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  inlineEmptyText: {
    fontSize: 14,
  },
  inlineResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inlineRowSeparator: {
    height: 1,
    marginLeft: 68,
  },
  contactsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  contactsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  userResultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userAvatarWrapper: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  userAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
  },
  userResultText: {
    flex: 1,
  },
  userResultName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userResultUsername: {
    fontSize: 13,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  friendBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  // Invite
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  inviteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
