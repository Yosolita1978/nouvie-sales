---
name: frontend-design
description: Create distinctive, mobile-first Next.js interfaces with high design quality. Use when building pages, components, or layouts. Generates polished code that avoids generic AI aesthetics.
---

## Tech Stack

- Next.js 14+ App Router
- TypeScript
- Tailwind CSS
- Mobile-first breakpoints (sm → md → lg → xl)

## Mobile-First Rules

1. **Default styles = mobile**. No breakpoint prefix means phone.
2. **Scale up**: `text-sm md:text-base lg:text-lg`
3. **Touch targets**: Minimum 44x44px for interactive elements
4. **Stack by default**: Use `flex-col` then `md:flex-row`
5. **Test at 375px width first**

## Design Principles

Before coding, commit to a BOLD aesthetic direction:

- **Tone**: Pick one extreme—brutally minimal, maximalist, retro-futuristic, organic, luxury, playful, editorial, brutalist, art deco, soft/pastel, industrial
- **Differentiation**: What makes this UNFORGETTABLE?

## Typography

- Choose distinctive fonts, never Inter/Arial/Roboto/system fonts
- Pair a display font with a refined body font
- Use Google Fonts or next/font for optimization

## Color & Theme

- Use CSS variables in globals.css
- Dominant color + sharp accent beats evenly-distributed palettes
- Commit to light OR dark, don't hedge

## Motion

- CSS-only when possible
- One orchestrated page load > scattered micro-interactions
- Use `animation-delay` for staggered reveals

## Layout

- Unexpected compositions: asymmetry, overlap, grid-breaking
- Generous negative space OR controlled density
- Never center everything

## File Structure
```
src/
  components/    # Reusable components
  app/           # Pages and layouts
  styles/        # Global CSS
```

## Anti-Patterns (NEVER)

- Generic gradients on white backgrounds
- Cookie-cutter card layouts
- Predictable hero + 3-column features
- Space Grotesk (overused)
- Purple/blue tech gradients