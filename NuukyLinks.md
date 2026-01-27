# Nuuky "Streaks" UX — Orbit Link + Anchor

## Goal

Build a Snapstreak-like retention loop that fits Nuuky's identity:

- **Ambient presence** (not forced messaging)
- **Low-pressure connection** (multiple valid ways to keep it alive)
- **Meaningful support** (not spam)

This doc defines two complementary mechanics:

1. **Connection Streak** (daily habit loop)
2. **Support Bond** (differentiator; "care over time")

---

## 1) Connection Streak (Primary)

### Name

**Orbit Link** (short: **Link**)

### What it should feel like

- "We're still in each other's orbit."
- Not "we must message daily."
- Multiple valid ways to keep it alive (reduces anxiety).

### What counts as a "check-in" (MVP)

A day counts when **both people** do **at least one** check-in within a rolling 24h window.

**Check-ins:**

- **Nudge sent** (`nudges` insert)
- **Co-presence in a room** (both in `room_participants` within same 24h)
- **Heart/React** (only if it's "real", not spam)

### Guardrails (to prevent spam/emptiness)

**Heart/React should not be unlimited:**

- Only the **first** heart per friend per day can count as a check-in, OR
- Heart only counts if user has **viewed** that friend today, OR
- Heart only counts if the other person has interacted recently (mutuality)

**Co-presence should feel earned:**

- Count only if you overlap in a room for at least a short threshold (e.g., "a moment", not instant join/leave)

### Warning state ("hourglass" equivalent)

Don't copy ⏳. Use a Nuuky-native metaphor:

**"Orbit fading"**

- Link ring gradually **dims/thins** as expiry approaches
- Near expiry it becomes **broken/dotted** + gentle pulse
- Optional soft notification: "your link with alex is fading"

**Visual states:**

- **Strong**: Full glowing ring around friend particle
- **Fading**: Ring dims, becomes thinner
- **Critical**: Ring becomes broken/dotted + pulse animation
- **Time remaining**: Only show exact time (e.g., "~3h left") when in critical state

### Where it appears (UI)

**Orbit:**

- Ring around friend particle = Link state
- Tiny number shows streak days
- Time remaining only surfaces when "fading"

**Friends list:**

- Row badge: `Link 12`
- If fading: `fading • ~3h left` + quick actions (Nudge / Join room)

**Friend action bubble:**

- Small line: `link 12 (fading)` with recommended action

### Tone / copy direction

- lowercase, calm urgency, no guilt
- Examples:
  - "link is fading"
  - "keep the link alive"
  - "nudge or hop in a room"
  - "your orbit with alex is fading"

---

## 2) Support Differentiator (Secondary)

### Don't call it a streak

Support is episodic. Make it **bond/score**, not a daily countdown.

### Name

**Anchor** (short: **Anchor Bond**)

### What it should feel like

- "This person shows up when it matters."
- Not competitive, not public ranking.
- More mature/empathetic than Snapchat gamification.

### What powers it (high-signal behaviors)

**MVP signals:**

- **Responding to a flare** (strongest)
- **Joining a friend's room after a call-me / flare** (second strongest)

**Optional later:**

- Support during "rough mood" windows (careful: avoid surveillance vibes)

### How it's shown (socially safe)

- Primarily visible in **friend detail** or subtle profile card
- Avoid leaderboards
- Avoid "top anchors" comparisons
- Show it primarily to the user ("you're an anchor for them") rather than ranking friends publicly

### Copy examples

- "you've anchored alex 4 times"
- "alex anchored you 2 times"
- "anchor grows when you show up"

### Visual

- Small **anchor glyph** or "shield" badge
- Shows "shown up X times" rather than a daily count
- Calm icon (shield/anchor/halo) + "You've shown up X times" on friend detail view

---

## Recommended shipping order

1. **Orbit Link** (Connection Streak): Start with nudge + co-presence, then add heart with guardrails
2. **Anchor Bond** (Support): Flare-response-driven

---

## Why this combo works

- **Link** drives daily opens without forcing "chatting"
- **Anchor** makes Nuuky distinct: care/availability as the real game
- Together they encourage both **consistency** and **meaningful support**

---

## Integration notes

- Keep the "hourglass" concept visual (ring dim/break) and only surface exact time remaining when close to expiry
- Make hearts countable but constrained so Link doesn't devolve into tap spam
- Avoid making Anchor feel like a competition or public ranking
- Ghost mode / break mode: Consider pausing streak decay while user is in break mode (otherwise conflicts with feature intent)
- Blocks: If either user blocks the other, freeze or end the streak (and hide it)

---

## UI Theme: "Orbit Link" (Recommended)

**Why Theme A is best:**

- Most "Nuuky" (fits your ambient presence / orbit metaphor)
- Avoids Snapchat's fire emoji baggage
- Maps perfectly onto your existing Orbit UI

**Visual elements:**

- Connection Streak: Thin glowing ring that wraps friend particle
- Warning state: Ring becomes broken/dotted + subtle pulse
- Support Bond: Small anchor/shield badge in friend detail view
