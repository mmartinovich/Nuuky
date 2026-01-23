# Friends Connection Flow - Implementation Plan

## Goal
Make the full friends flow work: Find contacts on Nūūky → Add them instantly → Invite to rooms

## Current State
- Contact sync (`useContactSync`) - **Working**
- Friends UI (`friends.tsx`) - **Working**
- Room invites (`InviteFriendsModal`) - **Working**
- `addFriend` function - **Broken** (mock mode + one-way only)

## Problems Found

### 1. Mock Mode Enabled
`useFriends.ts` line 24: `USE_MOCK_DATA = true` bypasses all real Supabase operations

### 2. One-Way Friendships
Current `addFriend()` only creates ONE record:
- User A adds User B → A sees B in their list
- But B does NOT see A (no reverse record)

### 3. RLS Policy Blocks Two-Way Creation
Current INSERT policy: `user_id = auth.uid()` only
Cannot insert record where `user_id` is the other person

---

## Implementation Steps

### Step 1: Disable Mock Mode
**File:** `nooke/hooks/useFriends.ts`

```typescript
// Line 24: Change from true to false
const USE_MOCK_DATA = false;
```

### Step 2: Update RLS Policy for Two-Way Friendships
**Supabase Migration** - Allow inserting friendship where user is either party

```sql
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;

-- New policy: allow insert if user is on either side
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());
```

### Step 3: Fix addFriend for Two-Way Friendships
**File:** `nooke/hooks/useFriends.ts`

Modify `addFriend()` function to:
1. Check if friendship exists in either direction
2. Insert TWO records (mutual friendship)

```typescript
// Check existing (either direction)
const { data: existing } = await supabase
  .from('friendships')
  .select('id')
  .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser.id})`)
  .maybeSingle();

if (existing) {
  // Already friends
  return;
}

// Create TWO-WAY friendship
const { error } = await supabase
  .from('friendships')
  .insert([
    { user_id: currentUser.id, friend_id: userId, status: 'accepted' },
    { user_id: userId, friend_id: currentUser.id, status: 'accepted' },
  ]);
```

### Step 4: Fix removeFriendship to Remove Both Directions
**File:** `nooke/hooks/useFriends.ts`

Ensure `removeFriendship()` deletes both directions (already does this - verify)

---

## Files to Modify

| File | Changes |
|------|---------|
| `nooke/hooks/useFriends.ts` | Disable mock mode, fix two-way add/remove |
| Supabase (migration) | Update friendships INSERT RLS policy |

## No Changes Needed
- `useContactSync.ts` - Already works
- `friends.tsx` - UI complete, handles added state
- `InviteFriendsModal.tsx` - Already works
- `appStore.ts` - State management correct

---

## Verification

1. **Test Contact Sync:**
   - Go to Friends tab → tap "Find Friends"
   - Grant contacts permission
   - See contacts that are on Nūūky

2. **Test Add Friend:**
   - Tap "Add" on a contact
   - Friend appears in "My Friends" section
   - Check Supabase: TWO rows exist (both directions)

3. **Test Room Invite:**
   - Create or enter a room
   - Tap settings → "Invite Friends"
   - See friends from "My Friends" list
   - Invite works

4. **Test from Other User's Perspective:**
   - Log in as the other user
   - They should see you in their "My Friends" list (mutual)

---

## Estimated Effort
- Step 1: 1 minute
- Step 2: 5 minutes (Supabase migration)
- Step 3-4: 10 minutes
- Testing: 10 minutes

**Total: ~25 minutes**

---

## Solo Developer Testing Setup

Since you're the only dev, create test users to simulate friends:

### Step 1: Create Test Users in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- Create test users with phone numbers
INSERT INTO users (id, phone, display_name, email, mood, is_online, created_at)
VALUES
  (gen_random_uuid(), '+15551110001', 'Alex Test', 'alex@test.com', 'good', true, now()),
  (gen_random_uuid(), '+15551110002', 'Jordan Test', 'jordan@test.com', 'neutral', true, now()),
  (gen_random_uuid(), '+15551110003', 'Sam Test', 'sam@test.com', 'not_great', false, now());
```

### Step 2: Add Contacts to Your Device

Add these contacts to your phone/simulator:
- **Alex Test**: +1 555-111-0001
- **Jordan Test**: +1 555-111-0002
- **Sam Test**: +1 555-111-0003

### Step 3: Test the Flow

1. Open app → Friends tab → "Find Friends"
2. Grant contacts permission
3. See Alex, Jordan, Sam in "People on Nūūky"
4. Tap "Add" → They appear in "My Friends"
5. Go to a room → Invite them

### Cleanup (Optional)

```sql
-- Remove test users when done
DELETE FROM users WHERE email LIKE '%@test.com';
```
