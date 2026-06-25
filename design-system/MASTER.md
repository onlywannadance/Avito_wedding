# Design System — Wedding Catalog (WeddingDreams)

> Generated following UI/UX Pro Max guidelines for wedding invitation catalog

## Pattern
**Hero-Centric + Feature-Rich Showcase**
- Hero with emotional headline and CTA
- Bento grid catalog with filter/search
- Modal preview for demos
- Social proof footer

## Style
**Soft UI Evolution + Glassmorphism + Motion-Driven**
- Soft shadows, subtle depth, premium feel
- Glass cards with backdrop-blur
- Stagger animations on scroll
- Gentle hover states (200-300ms)

## Colors
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#F4F1EA` | Warm cream (not pink) |
| Background alt | `#EBE6DC` | Section alternates |
| Primary | `#6B7B5E` | Olive sage accents |
| Accent | `#A88B5A` | Warm gold |
| Dark | `#3D3A35` | Header, CTA, buttons |
| Text | `#2C2825` | Body text |
| Surface | `#FDFCF9` | Cards, inputs |

## Typography
- **Display**: Cormorant Garamond (elegant serif)
- **Body**: Montserrat (clean sans-serif)
- Google Fonts import required

## Key Effects
- Aurora gradient mesh background
- Floating particle orbs
- Card lift on hover (`translateY(-4px)`)
- Smooth scroll reveal
- Glass modal overlay
- `prefers-reduced-motion` respected

## Anti-Patterns (Avoid)
- Neon colors, harsh animations
- AI purple/pink gradients
- Emojis as icons (use SVG/Lucide-style inline SVG)
- Missing cursor-pointer on clickable elements

## Accessibility
- Contrast ratio 4.5:1 minimum
- Visible focus states
- Keyboard navigation for modal
- Responsive: 375px, 768px, 1024px, 1440px
