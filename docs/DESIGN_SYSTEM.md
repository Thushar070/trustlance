# TrustLance Design System

This document outlines the visual identity, tokens, and guidelines established during the UI/UX enhancement pass. The design system is implemented using CSS Variables and `@theme inline` extensions in `app/globals.css`, ensuring full compatibility with Tailwind CSS.

---

## 1. Brand Color Palette

For a professional escrow and payment workspace, the brand tone relies on deep, authoritative Indigo for primary highlights and slate/near-black neutral structures. It supports a dual-theme system (Light and Dark) toggled via a Class strategy.

| Token | Variable | Light Value | Dark Value | Description |
|---|---|---|---|---|
| Background | `var(--background)` | `#F8F7FF` | `#000000` | Main background of the app (soft lavender tint in light) |
| Surface | `var(--surface)` | `#FFFFFF` | `#111111` | Card and component container background |
| Surface Elevated | `var(--surface-elevated)` | `#FFFFFF` | `#1a1a1a` | Dropdown and modal container background |
| Surface Subtle | `var(--surface-subtle)` | `#F3F1FF` | `#0a0a0a` | Secondary layout container background (deeper lavender in light) |
| Accent (Primary) | `var(--accent)` | `#4F46E5` | `#6366F1` | Primary actions and brand highlights |
| Accent Hover | `var(--accent-hover)` | `#3730A3` | `#4F46E5` | Hover state for primary actions |
| Accent Light | `var(--accent-light)` | `#EEF2FF` | `rgba(99, 102, 241, 0.12)` | Tinted background for tags & subtle alerts |
| Border | `var(--border)` | `rgba(15, 23, 42, 0.08)` | `rgba(255, 255, 255, 0.08)` | Default separator lines |
| Border Subtle | `var(--border-subtle)` | `rgba(15, 23, 42, 0.04)` | `rgba(255, 255, 255, 0.04)` | Subtle division lines |
| Text Primary | `var(--text-primary)` | `#0F172A` | `#f5f5f5` | Main typography color |
| Text Secondary | `var(--text-secondary)` | `#64748B` | `#a0a0a0` | Secondary details / metadata |
| Text Muted | `var(--text-muted)` | `#94A3B8` | `#64748B` | Dates, disabled tags, placeholders |
| Card Shadow | `var(--card-shadow)` | `0 1px 3px rgba(0,0,0,0.05)…` | `0 1px 2px rgba(0,0,0,0.2)` | Default card elevation |
| Card Shadow Hover | `var(--card-shadow-hover)` | `0 4px 12px rgba(0,0,0,0.08)…` | `0 4px 12px rgba(0,0,0,0.3)` | Hovered card elevation |

---

## 2. Semantic Status Color System

Status badges throughout the system are visually distinct depending on their semantic meaning. We use the **12% opacity background + full color text/border** badge pattern in Dark Mode, and **8% opacity background + solid text/border** in Light Mode:

| Project / Escrow Status | Light Bg / Text & Border | Dark Bg / Text & Border | Meaning |
|---|---|---|---|
| **OPEN** / **PENDING** | `rgba(37, 99, 235, 0.08)` / `#2563EB` | `rgba(96, 165, 250, 0.12)` / `#60A5FA` | Available / accepting proposals |
| **ASSIGNED** / **IN_PROGRESS** | `rgba(217, 119, 6, 0.08)` / `#D97706` | `rgba(245, 158, 11, 0.12)` / `#F59E0B` | Active workflow / waiting on user action |
| **UNDER_REVIEW** / **ADMIN_REVIEW** | `rgba(37, 99, 235, 0.08)` / `#2563EB` | `rgba(96, 165, 250, 0.12)` / `#60A5FA` | Work submitted / awaiting audit |
| **COMPLETED** / **RELEASED** / **SUCCESS** | `rgba(5, 150, 105, 0.08)` / `#059669` | `rgba(16, 185, 129, 0.12)` / `#10B981` | Final positive state (funds dispersed) |
| **DISPUTED** | `rgba(217, 119, 6, 0.08)` / `#D97706` | `rgba(245, 158, 11, 0.12)` / `#F59E0B` | Flagged / mediator assistance requested |
| **CANCELLED** / **REFUNDED** / **FAILED** | `rgba(220, 38, 38, 0.08)` / `#DC2626` | `rgba(248, 113, 113, 0.12)` / `#F87171` | Final negative state (failed check) |
| **CLOSED** | `rgba(100, 116, 139, 0.08)` / `#64748B` | `rgba(144, 150, 165, 0.12)` / `#9096A5` | Project closed without delivery |

---

## 3. Dark/Light Mode Theme Selection Mechanism

- **Theme Toggle**: Cycles through **Light** ☀️ → **Dark** 🌙 → **System** 🖥️.
- **Provider**: Handled via `components/ThemeProvider.tsx`, which attaches the `.dark` class directly to the `<html>` node.
- **State Persistence**: Theme state is serialized to `localStorage` under `trustlance-theme`.
- **Theme Flash Prevention**: Root layout includes a blocking inline script in `<head>` to evaluate stored settings and append `.dark` before the first page render is painted.

---

## 4. Desktop Layout Conventions

To support high-density screens and avoid large empty spaces, TrustLance implements centered max-width layouts:

- **Max-Width Wrapper**: All core dashboard and landing pages use a centered wrapper of `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (or `max-w-4xl` for forms/settings).
- **Responsive Navbar**:
  - Below `1024px`: Adapts to mobile layout with sliding hamburger drawer panel.
  - `1024px` to `1440px`: Condensed desktop layout. Less critical links (Payments, Assignments, Disputes) collapse into a "More" dropdown, and user controls are accessible via an avatar dropdown to prevent wrap-induced overflows.
  - Above `1440px`: Full desktop view displaying all primary links, full username strings, and role badges.
- **Data Grids**: Dense layouts (e.g. Admin Overview statistics and logs) use multi-column grids (e.g. 2-column or 3-column rows) to balance negative spaces.
