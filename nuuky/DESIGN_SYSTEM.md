# Nūūky Design System
## Soft Cosmic Aesthetic

### Design Philosophy

Nūūky uses a **soft cosmic aesthetic** to create a calm, meditative experience. Friends appear as luminous celestial bodies in your personal orbit, creating an ambient presence that feels peaceful and non-intrusive.

---

## Color Palette

### Backgrounds
- **Primary**: `#0a0e27` - Deep cosmic navy
- **Secondary**: `#1a1f3a` - Rich indigo
- **Tertiary**: `#252b4a` - Twilight blue

### Mood Colors

Each mood has three variants: base (solid), glow (halo), and soft (subtle backgrounds)

**Good** 😊
- Base: `#4ade80` (vibrant green)
- Glow: `rgba(74, 222, 128, 0.4)`
- Soft: `rgba(74, 222, 128, 0.1)`

**Neutral** 😐
- Base: `#facc15` (warm yellow)
- Glow: `rgba(250, 204, 21, 0.4)`
- Soft: `rgba(250, 204, 21, 0.1)`

**Not Great** 😔
- Base: `#9ca3af` (calm gray)
- Glow: `rgba(156, 163, 175, 0.3)`
- Soft: `rgba(156, 163, 175, 0.08)`

**Reach Out** 🆘
- Base: `#a855f7` (supportive purple)
- Glow: `rgba(168, 85, 247, 0.4)`
- Soft: `rgba(168, 85, 247, 0.1)`

### Text Colors
- **Primary**: `#f8f9fa` - Bright, readable white
- **Secondary**: `#b8bcc8` - Muted gray
- **Tertiary**: `#6b7280` - Subtle gray
- **Accent**: `#e0e7ff` - Soft lavender

### UI Elements
- **Border**: `rgba(255, 255, 255, 0.08)` - Subtle dividers
- **Card**: `rgba(255, 255, 255, 0.03)` - Frosted glass effect
- **Overlay**: `rgba(10, 14, 39, 0.7)` - Modal backgrounds

---

## Typography

### Font Stack
- **Display**: System serif (elegant, distinctive)
- **Body**: System default (clean, readable)
- **Mono**: Monospace (code, special cases)

### Scale
- `xs`: 12px
- `sm`: 14px - Labels, hints
- `base`: 16px - Body text
- `lg`: 18px - Emphasized text
- `xl`: 20px - Subheadings
- `2xl`: 24px - Card titles
- `3xl`: 30px - Section headers
- `4xl`: 36px - Page titles
- `5xl`: 48px - Hero text

### Weight
- Normal: 400
- Medium: 500 - Labels
- Semibold: 600 - Buttons, emphasis
- Bold: 700 - Headings

---

## Spacing System

Consistent spacing creates visual rhythm:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px
- `3xl`: 64px

---

## Border Radius

Soft, organic corners throughout:
- `sm`: 8px - Small elements
- `md`: 12px - Inputs, badges
- `lg`: 16px - Cards, buttons
- `xl`: 24px - Large cards
- `full`: 9999px - Circular elements

---

## Components

### Friend Orb
The centerpiece of Nūūky's design - luminous celestial bodies representing friends.

**Structure**:
- Outer glow (90px) - Pulsing halo
- Middle glow (70px) - Secondary halo
- Core orb (50px) - Solid mood color
- Online indicator (20px ring) - Status badge

**States**:
- **Online**: Bright, pulsing glow animation (2s loop)
- **Offline**: Dim, static glow (50% opacity)

**Animation**:
- Scale: 1.0 → 1.15 → 1.0 (smooth pulse)
- Opacity: 0.6 → 0.9 → 0.6 (glow breathing)
- Duration: 2000ms per cycle
- Easing: Default (natural feel)

### Cards
Frosted glass effect with subtle gradients:
- Background: Linear gradient `rgba(255,255,255,0.05)` → `rgba(255,255,255,0.02)`
- Border: 1px `rgba(255,255,255,0.08)`
- Border radius: 16-24px
- Padding: 16-24px

### Buttons
Soft, glowing interactive elements:
- Background: Gradient `rgba(240,244,255,0.12)` → `rgba(240,244,255,0.06)`
- Border: 1px `rgba(255,255,255,0.08)`
- Text: White/light gray
- Active opacity: 0.8

### Inputs
Clean, minimal with soft borders:
- Background: `rgba(255,255,255,0.03)`
- Border: 1px `rgba(255,255,255,0.08)`
- Placeholder: `#6b7280`
- Selection: `#f0f4ff`
- Border radius: 12-16px

---

## Gradients

### Background
`['#0a0e27', '#1a1f3a', '#0f1629']`
Deep cosmic gradient from top to bottom

### Card
`['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']`
Subtle frosted glass effect

### Button
`['rgba(240,244,255,0.12)', 'rgba(240,244,255,0.06)']`
Soft, glowing appearance

---

## Motion & Animation

### Principles
1. **Slow & Graceful** - Like celestial movement
2. **Purposeful** - Animations enhance meaning
3. **Subtle** - Never overwhelming

### Animation Patterns

**Pulse (Online Friends)**
```
Scale: 1.0 → 1.15 → 1.0
Opacity: 0.6 → 0.9 → 0.6
Duration: 2000ms
Loop: Infinite
```

**Glow Breathing**
```
Opacity: 0.6 → 0.9 → 0.6
Duration: 2000ms
Loop: Infinite
```

**Float (Decorative Orbs)**
```
Scale: 1.0 → 1.1 → 1.0
Duration: 2000ms
Loop: Infinite
```

---

## Screens

### Login Screen
- Centered decorative orb with pulse
- Large, spaced title "Nūūky"
- Subtitle explaining concept
- Single input with uppercase label
- Prominent continue button

### Verify Screen
- Clean, focused layout
- Large code input (centered, spaced digits)
- Primary verify button
- Inline resend/change actions

### Orbit View (Home)
- Greeting header "Your Orbit"
- Current mood card (frosted glass)
- Friend orbs in grid layout
- Soft gradient background
- Quick action cards at bottom

### Profile & Settings
- Clean list layouts
- Frosted glass cards
- Subtle dividers
- Consistent spacing

---

## Visual Details

### Grain Texture
A subtle noise overlay adds warmth and prevents flatness:
```
Position: Absolute overlay
Background: rgba(255,255,255,0.01)
Opacity: 0.5
Pointer events: None
```

### Glow Effects
Multi-layer approach for depth:
1. Outer glow - Large, soft
2. Middle glow - Medium brightness
3. Core - Solid, vibrant

### Spacing Philosophy
- Generous padding prevents claustrophobia
- Consistent gaps create rhythm
- Breathing room around important elements

---

## Usage Guidelines

### DO
✓ Use generous spacing
✓ Layer multiple glows for depth
✓ Animate online friends subtly
✓ Keep interactions gentle (0.7-0.8 opacity)
✓ Maintain cosmic color palette

### DON'T
✗ Use bright, harsh colors
✗ Create jarring animations
✗ Overcrowd the interface
✗ Use generic system fonts in hero text
✗ Add unnecessary visual noise

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- Mood colors are distinguishable by brightness
- Animations can be reduced (system preference)
- Touch targets minimum 44x44px
- Clear visual hierarchy

---

## Implementation

All design tokens are centralized in `/lib/theme.ts`:
- Import: `import { colors, typography, spacing } from '@/lib/theme'`
- Use consistently across all components
- Never hardcode colors or spacing

---

**Design Principle**: Every element serves the core purpose - creating calm, ambient presence without pressure to communicate.
