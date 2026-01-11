# Rooms Feature Implementation Plan

## Overview
Transform rooms from session-based modal experience to **persistent friend circles** with orbit UI. Each room is a private invite-only space for selected friends.

---

## Phase 1: Database & Types Foundation

### 1.1 Create `room_invites` table in Supabase
```sql
CREATE TABLE room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  responded_at TIMESTAMPTZ
);

-- Index for fast queries
CREATE INDEX idx_room_invites_receiver ON room_invites(receiver_id, status);
CREATE INDEX idx_room_invites_room ON room_invites(room_id, status);
```

### 1.2 Update `rooms` table
- Remove `is_public` column (all rooms are private)
- Ensure `is_active` defaults to `true` for persistent rooms
- Add `max_members` default of 10

### 1.3 Add TypeScript types
**File:** [types/index.ts](nooke/types/index.ts) (after line 48)

```typescript
export interface RoomInvite {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  room?: Room;
  sender?: User;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  responded_at?: string;
}
```

### 1.4 Update Zustand store
**File:** [stores/appStore.ts](nooke/stores/appStore.ts)

Add state:
- `roomInvites: RoomInvite[]`
- `myRooms: Room[]` (rooms user created or is member of)

Add actions:
- `setRoomInvites`, `addRoomInvite`, `removeRoomInvite`
- `setMyRooms`, `addMyRoom`, `removeMyRoom`

---

## Phase 2: Rooms Hook & API Layer

### 2.1 Create `useRoomInvites` hook
**File:** `nooke/hooks/useRoomInvites.ts` (NEW)

Functions:
- `loadMyInvites()` - Fetch pending invites for current user
- `sendInvite(roomId, friendId)` - Create invite + push notification
- `acceptInvite(inviteId)` - Update status, add to room_participants
- `declineInvite(inviteId)` - Update status to declined
- `getPendingInvitesForRoom(roomId)` - Show creator who hasn't accepted yet
- Real-time subscription for invite changes

### 2.2 Update `useRoom` hook
**File:** [hooks/useRoom.ts](nooke/hooks/useRoom.ts)

Changes:
- `loadMyRooms()` - Fetch rooms where user is creator OR participant
- `createRoom(name, friendIds?)` - Create room + optionally send invites
- `deleteRoom(roomId)` - Creator only, removes room entirely
- `updateRoomName(roomId, name)` - Creator only
- `removeParticipant(roomId, userId)` - Creator only
- `transferOwnership(roomId, newOwnerId)` - Creator only
- `canCreateRoom()` - Check if under 5 room limit
- Remove auto-close logic (rooms persist until deleted)

### 2.3 Create `useFirstTimeRoom` hook
**File:** `nooke/hooks/useFirstTimeRoom.ts` (NEW)

- Check if user has any rooms
- If not, auto-create "My Nooke" default room
- Show onboarding prompt to invite friends

---

## Phase 3: Rooms List Page

### 3.1 Create Rooms page
**File:** `nooke/app/(main)/rooms.tsx` (NEW)

**Layout:**
```
┌─────────────────────────────┐
│  ← Back         Rooms    +  │  Header
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │ INVITES (2)         ▼  ││  Collapsible section
│  │ ┌─────────────────────┐ ││
│  │ │ Squad • from Taylor │ ││
│  │ │ [Accept] [Decline]  │ ││
│  │ └─────────────────────┘ ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  MY ROOMS                   │
│  ┌─────────────────────────┐│
│  │ 🟢 My Nooke     3/10   ││  Room card
│  │ ○○○ avatars            ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ 🟢 Squad        5/10   ││
│  │ ○○○○○ avatars          ││
│  └─────────────────────────┘│
│                             │
│  (Empty: Create your first  │
│   room to hang with friends)│
└─────────────────────────────┘
```

**Features:**
- Header with back button and "+" create button
- Invites section (collapsible, shows count badge)
- My Rooms list with participant avatars
- Tap room → navigate to `/room/[id]`
- Empty state for new users
- Pull-to-refresh

### 3.2 Create RoomCard component
**File:** `nooke/components/RoomCard.tsx` (NEW)

- Room name, member count (X/10)
- First 5 participant avatars
- Online indicator if anyone active
- Creator badge/icon

### 3.3 Create InviteCard component
**File:** `nooke/components/InviteCard.tsx` (NEW)

- Room name, inviter name/avatar
- Accept/Decline buttons
- Time remaining indicator (expires in X hours)

### 3.4 Update navigation
**File:** [app/(main)/index.tsx](nooke/app/(main)/index.tsx)

- Change `handleOpenRooms` (line 691) to `router.push('/(main)/rooms')`
- Remove RoomListModal usage
- Keep badge showing invite count instead of active rooms

---

## Phase 4: Room View with Orbit UI

### 4.1 Extract reusable OrbitView component
**File:** `nooke/components/OrbitView.tsx` (NEW)

Extract from [index.tsx](nooke/app/(main)/index.tsx):
- Pan responder gesture handling (lines 92-157)
- Position calculation algorithm (lines 180-267)
- Orbit angle animation management

Props:
```typescript
interface OrbitViewProps {
  participants: User[];
  currentUser: User;
  onParticipantPress: (user: User) => void;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}
```

### 4.2 Update Room screen
**File:** [app/(main)/room/[id].tsx](nooke/app/(main)/room/[id].tsx)

Replace current list view with OrbitView:
- Room name in header (editable for creator)
- Settings icon (creator only) → opens management modal
- Central orb shows current user
- Participant particles orbit around
- Leave button in footer
- Back navigation to rooms list

### 4.3 Create RoomSettingsModal component
**File:** `nooke/components/RoomSettingsModal.tsx` (NEW)

**Options (Creator only):**
- Edit room name
- Invite friends (opens friend picker)
- View pending invites
- Remove members (swipe to remove)
- Transfer ownership (select new owner)
- Delete room (with confirmation)

### 4.4 Create InviteFriendsModal component
**File:** `nooke/components/InviteFriendsModal.tsx` (NEW)

- List of friends not already in room
- Checkbox selection
- "Send Invites" button
- Shows who's already invited (pending)

---

## Phase 5: Room Creation Flow

### 5.1 Update CreateRoomModal
**File:** [components/CreateRoomModal.tsx](nooke/components/CreateRoomModal.tsx)

Changes:
- Remove privacy toggle (all rooms private)
- Add friend selection step (optional)
- Show room limit warning (X/5 rooms)
- Validate room name

### 5.2 First-time user flow
In rooms.tsx:
- Detect first-time user (no rooms)
- Auto-create "My Nooke" room
- Show friendly onboarding card
- Prompt to invite friends

---

## Phase 6: Notifications & Real-time

### 6.1 Push notifications for invites
**File:** [hooks/useRoomInvites.ts](nooke/hooks/useRoomInvites.ts)

When sending invite:
- Call Supabase Edge Function to send push
- Notification: "[Name] invited you to [Room]"
- Deep link to rooms page

### 6.2 Real-time subscriptions
Update hooks to subscribe to:
- `room_invites` table changes (new invites, status changes)
- `room_participants` table changes (joins, leaves)
- `rooms` table changes (name updates, deletions)

### 6.3 Expire old invites
- Supabase cron job or Edge Function
- Run daily to mark expired invites as 'declined'
- Or check expiry client-side when loading

---

## Phase 7: Polish & Edge Cases

### 7.1 Limits enforcement
- Max 5 rooms per user (check before create)
- Max 10 members per room (check before invite accept)
- Disable invite button when room full

### 7.2 Edge cases
- User leaves room they created → prompt to transfer or delete
- Last member leaves → keep room (creator can re-invite)
- Invite expired → show "Expired" state, auto-remove
- Room deleted while viewing → navigate back with message

### 7.3 Loading states
- Skeleton loaders for rooms list
- Optimistic updates for accept/decline
- Pull-to-refresh on rooms page

---

## Files to Create (NEW)
| File | Purpose |
|------|---------|
| `app/(main)/rooms.tsx` | Rooms list page |
| `hooks/useRoomInvites.ts` | Invite management |
| `hooks/useFirstTimeRoom.ts` | Default room creation |
| `components/OrbitView.tsx` | Reusable orbit UI |
| `components/RoomCard.tsx` | Room list item |
| `components/InviteCard.tsx` | Invite list item |
| `components/RoomSettingsModal.tsx` | Room management |
| `components/InviteFriendsModal.tsx` | Friend picker for invites |

## Files to Modify
| File | Changes |
|------|---------|
| `types/index.ts` | Add RoomInvite type |
| `stores/appStore.ts` | Add invite & myRooms state |
| `hooks/useRoom.ts` | Add management functions, remove auto-close |
| `app/(main)/index.tsx` | Update Rooms button navigation |
| `app/(main)/room/[id].tsx` | Use OrbitView, add settings |
| `components/CreateRoomModal.tsx` | Remove privacy, add friend selection |

## Database Changes (Supabase)
- Create `room_invites` table
- Remove `is_public` from `rooms` table
- Add indexes for performance

---

## Verification & Testing

### Manual Testing Checklist
1. **First-time user**: Opens app → Rooms page shows default "My Nooke" room with onboarding
2. **Create room**: Tap + → Enter name → Select friends → Room created, invites sent
3. **Receive invite**: Push notification appears → Rooms page shows invite → Accept joins room
4. **Room view**: Tap room → See orbit UI with all members → Interactions work
5. **Room management**: Creator taps settings → Can edit name, remove members, delete
6. **Limits**: Try creating 6th room → Shows limit warning
7. **Transfer ownership**: Creator transfers → New creator has management options
8. **Invite expiry**: Wait 24h (or mock) → Invite disappears

### Edge Cases to Test
- Decline invite → Invite removed, can be re-invited
- Leave room as creator → Prompt to transfer/delete
- Delete room while others viewing → They navigate back
- Accept invite to full room → Shows "room full" message
- Offline behavior → Graceful degradation

---

## Design Notes
- Match existing glassmorphism + neon aesthetic
- Use theme colors from [lib/theme.ts](nooke/lib/theme.ts)
- Mood colors for participant indicators
- Consistent spacing and typography
- Smooth animations matching orbit feel
