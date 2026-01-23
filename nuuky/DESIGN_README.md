# Nūūky - Soft Cosmic Design 🌌

A distinctive, production-grade redesign with a **soft cosmic aesthetic**.

## What's New

### 🎨 Design Concept
Friends as **luminous celestial bodies** in your personal orbit. Calm, meditative, and peaceful - avoiding generic AI aesthetics with a unique cosmic theme.

### ✨ Key Features

**1. Deep Cosmic Backgrounds**
- Rich gradient: Navy → Indigo → Twilight
- Subtle grain texture for warmth
- Non-distracting dark theme

**2. Glowing Friend Orbs**
- Multi-layer glow effect (outer, middle, core)
- Smooth pulse animation for online friends
- Mood-based colors with soft halos
- 50% opacity when offline

**3. Frosted Glass UI**
- Cards with gradient transparency
- Subtle borders (8% white opacity)
- Layered depth without heaviness

**4. Graceful Animations**
- 2-second pulse cycles (online friends)
- Scale: 1.0 → 1.15 → 1.0
- Glow breathing: opacity fades in/out
- Celestial movement feel

**5. Typography**
- Large, spaced headers (48px)
- Uppercase labels with letter-spacing
- Clean hierarchy
- Readable on dark backgrounds

---

## Files Modified

### New Files
- ✅ `lib/theme.ts` - Complete design system tokens
- ✅ `components/FriendOrb.tsx` - Animated friend orb component
- ✅ `DESIGN_SYSTEM.md` - Comprehensive design documentation

### Redesigned Screens
- ✅ `app/(auth)/login.tsx` - Cosmic login with pulsing orb
- ✅ `app/(auth)/verify.tsx` - Clean verification screen
- ✅ `app/(main)/index.tsx` - Spectacular orbit view

---

## Design System Highlights

### Color Palette
```
Backgrounds: #0a0e27 → #1a1f3a (cosmic gradient)

Mood Colors:
- Good: #4ade80 (green)
- Neutral: #facc15 (yellow)
- Not Great: #9ca3af (gray)
- Reach Out: #a855f7 (purple)

Each with glow variants for halos
```

### Spacing
```
Generous, breathing room:
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### Components
- **Friend Orb**: 3-layer glow with pulse animation
- **Cards**: Frosted glass with gradient
- **Buttons**: Soft glow effect
- **Inputs**: Clean with subtle borders

---

## How to Test

### Run the app:
```bash
cd nooke
npx expo start
```

### What to look for:

**Login Screen**
- Deep gradient background
- Pulsing purple orb
- Large "Nūūky" title
- Clean input with subtle border
- Frosted glass button

**Verify Screen**
- Centered layout
- Large spaced code input
- Inline resend/change actions
- Consistent cosmic theme

**Orbit View** (The Star!)
- "Your Orbit" greeting
- Your mood card with orb
- Friends as glowing celestial bodies
- **Pulse animation** on online friends (must see!)
- Grid layout with breathing room
- Frosted action cards

---

## Animation Details

### Friend Orb Pulse (Online Only)

```typescript
// Scale animation
1.0 → 1.15 → 1.0 (2000ms loop)

// Glow animation
opacity: 0.6 → 0.9 → 0.6 (2000ms loop)

// Runs continuously for online friends
// Offline friends: static, 50% opacity
```

### Why it works:
- **Slow** - 2 seconds feels natural, not frantic
- **Subtle** - 15% scale change, barely noticeable
- **Purposeful** - Only online friends pulse
- **Graceful** - Smooth easing, like breathing

---

## Design Principles

1. **Ambient Presence**
   - Calm, not demanding attention
   - Glows, not harsh lights
   - Breathing animations

2. **Cosmic Metaphor**
   - Friends as celestial bodies
   - You have your own orbit
   - Space between elements

3. **Distinctive Aesthetic**
   - No generic fonts (avoided Inter/Roboto)
   - No purple gradients on white
   - Unique color scheme
   - Organic, flowing feel

4. **Production Quality**
   - Real animations (not placeholders)
   - Consistent design tokens
   - Accessible contrast ratios
   - Performant (CSS animations)

---

## What Makes This Different

### Avoided AI Slop:
- ❌ Generic Inter/Roboto fonts
- ❌ Purple gradient on white backgrounds
- ❌ Cookie-cutter card layouts
- ❌ Boring blue/gray color schemes
- ❌ No attention to motion

### Instead:
- ✅ Cosmic dark theme (unique)
- ✅ Multi-layer glow effects (depth)
- ✅ Purposeful animations (meaning)
- ✅ Distinctive mood colors (personality)
- ✅ Generous spacing (calm)
- ✅ Grain texture (warmth)

---

## Next Steps

### To Complete the Design:

1. **Profile Screen** - Redesign with cosmic theme
2. **Settings Screen** - Match frosted glass aesthetic
3. **Mood Picker** - Interactive orb selector
4. **Nudge Animation** - Haptic + visual feedback
5. **Flare Button** - Dramatic "SOS" state
6. **Room View** - Audio chat with cosmic feel

### Optional Enhancements:

- Add particle effects (subtle stars)
- Implement parallax scrolling
- Custom fonts (load Crimson Pro)
- Sound effects (optional, muted by default)
- Haptic feedback patterns
- Dark/light mode toggle (cosmic vs dawn)

---

## Dependencies Added

```bash
npm install expo-linear-gradient expo-blur
```

Both installed and ready to use!

---

## Design Files

1. **DESIGN_SYSTEM.md** - Complete design documentation
2. **lib/theme.ts** - All design tokens (colors, spacing, typography)
3. **components/FriendOrb.tsx** - Reusable animated orb

Import theme anywhere:
```typescript
import { colors, spacing, typography, radius } from '@/lib/theme';
```

---

## Testing Checklist

- [ ] Login screen shows pulsing orb
- [ ] Verify screen has clean centered layout
- [ ] Orbit view loads with gradient background
- [ ] Friend orbs pulse when online
- [ ] Friend orbs are dim when offline
- [ ] Grain texture visible (subtle)
- [ ] Frosted glass cards render correctly
- [ ] Touch interactions feel responsive
- [ ] Animations are smooth (60fps)
- [ ] Text is readable on dark backgrounds

---

## Notes

- **Animations require real device** - Simulators may lag
- **Test in dark environment** - Design optimized for night use
- **Grain texture is subtle** - Adds warmth without noise
- **Pulse is gentle** - Should feel like breathing, not blinking

---

## Comparison

**Before**: Generic white background, simple colored dots, basic list
**After**: Cosmic gradient, glowing orbs with halos, grid layout, breathing animations

The new design creates an **ambient, peaceful experience** that matches Nūūky's core concept: staying connected without pressure.

---

**Design by Claude with the frontend-design skill** 🎨
Soft Cosmic Aesthetic - Distinctive, production-ready, and memorable.
