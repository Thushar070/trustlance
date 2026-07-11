# TrustLance Design System

This document outlines the visual identity and guidelines established during the UI/UX enhancement pass. The design system is implemented using CSS Variables and `@theme inline` extensions in `app/globals.css`, ensuring full compatibility with Tailwind CSS.

---

## 1. Brand Color Palette

For a professional escrow and payment workspace, the brand tone relies on deep, authoritative Indigo for primary highlights and Slate for neutral structures.

| Token | Class / Variable | Color Value | Description |
|---|---|---|---|
| Background | `var(--background)` | `#f8fafc` | Main background of the app |
| Surface | `var(--surface)` | `#ffffff` | Card and component container background |
| Accent (Primary) | `var(--accent)` | `#4338ca` | Indigo-700, used for primary actions and brand color |
| Accent Hover | `var(--accent-hover)` | `#3730a3` | Indigo-800, hover color for primary actions |
| Accent Light | `var(--accent-light)` | `#eef2ff` | Indigo-50, tinted background for tags & subtle alerts |
| Border | `var(--border)` | `#e2e8f0` | Slate-200, default separator lines |
| Border Subtle | `var(--border-subtle)` | `#f1f5f9` | Slate-100, border tint for cards and divisions |
| Text Primary | `var(--text-primary)` | `#0f172a` | Slate-900, main typography color |
| Text Secondary | `var(--text-secondary)` | `#475569` | Slate-600, secondary text / details |
| Text Muted | `var(--text-muted)` | `#94a3b8` | Slate-400, dates, subtitle text, disabled elements |

---

## 2. Semantic Status Color System

Status badges throughout the system are visually distinct depending on their semantic meaning:

| Project / Escrow Status | Color Variable | Tailwind Classes | Tone Meaning |
|---|---|---|---|
| **OPEN** / **PENDING** | `--status-open` | `bg-sky-50 text-sky-700 border-sky-200` | Available / accepting proposals |
| **ASSIGNED** / **IN_PROGRESS** | `--status-progress` | `bg-amber-50 text-amber-700 border-amber-200` | Active workflow / waiting on user action |
| **UNDER_REVIEW** / **ADMIN_REVIEW** | `--status-review` | `bg-violet-50 text-violet-700 border-violet-200` | Work submitted / awaiting audit |
| **COMPLETED** / **RELEASED** / **SUCCESS** | `--status-success` | `bg-emerald-50 text-emerald-700 border-emerald-200` | Final positive state (funds dispersed) |
| **DISPUTED** | `--status-disputed` | `bg-orange-50 text-orange-700 border-orange-200` | Flagged / mediator assistance requested |
| **CANCELLED** / **REFUNDED** / **FAILED** | `--status-negative` | `bg-rose-50 text-rose-700 border-rose-200` | Final negative state (failed check) |
| **CLOSED** | `--status-neutral` | `bg-slate-100 text-slate-600 border-slate-200` | Project closed without delivery |

---

## 3. Shapes & Layout Rules

- **Borders**: All cards use `border border-[var(--border)] rounded-xl` (12px rounded corners) for a clean modern aesthetic.
- **Shadows**: Cards and buttons use `shadow-sm` for a slight lift. Avoid harsh, dark shadow classes.
- **Icons**: Every UI illustration has been migrated from old raw emojis to modern `lucide-react` icons (e.g. `Clock`, `CreditCard`, `Shield`, `FileText`, `Globe`, `Github`).
- **Focus Rings**: Accessibilities rings are customized to `focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]` on all input fields.
