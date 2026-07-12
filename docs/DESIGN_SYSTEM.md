# TrustLance Design System

This document outlines the visual identity and guidelines established during the UI/UX enhancement pass. The design system is implemented using CSS Variables and `@theme inline` extensions in `app/globals.css`, ensuring full compatibility with Tailwind CSS.

---

## 1. Brand Color Palette

For a professional escrow and payment workspace, the brand tone relies on deep, authoritative Indigo for primary highlights and Slate for neutral structures. It supports a dual-theme system (Light and Dark) toggled via a Class strategy.

| Token | Variable | Light Value | Dark Value | Description |
|---|---|---|---|---|
| Background | `var(--background)` | `#f8fafc` | `#0f172a` | Main background of the app |
| Surface | `var(--surface)` | `#ffffff` | `#1e293b` | Card and component container background |
| Surface Subtle | `var(--surface-subtle)` | `#f8fafc` | `#1e293b` | Secondary layout container background |
| Accent (Primary) | `var(--accent)` | `#4338ca` | `#818cf8` | Primary actions and brand highlights |
| Accent Hover | `var(--accent-hover)` | `#3730a3` | `#6366f1` | Hover state for primary actions |
| Accent Light | `var(--accent-light)` | `#eef2ff` | `#312e81` | Tinted background for tags & subtle alerts |
| Border | `var(--border)` | `#e2e8f0` | `#334155` | Default separator lines |
| Border Subtle | `var(--border-subtle)` | `#f1f5f9` | `#1e293b` | Subtle division lines |
| Text Primary | `var(--text-primary)` | `#0f172a` | `#f1f5f9` | Main typography color |
| Text Secondary | `var(--text-secondary)` | `#475569` | `#94a3b8` | Secondary details / metadata |
| Text Muted | `var(--text-muted)` | `#94a3b8` | `#64748b` | Dates, disabled tags, placeholders |

---

## 2. Semantic Status Color System

Status badges throughout the system are visually distinct depending on their semantic meaning, customized separately for light and dark themes:

| Project / Escrow Status | Color Variable prefix | Light Bg / Text / Border | Dark Bg / Text / Border | Meaning |
|---|---|---|---|---|
| **OPEN** / **PENDING** | `--status-open` | `#f0f9ff` / `#0369a1` / `#bae6fd` | `#0c4a6e` / `#38bdf8` / `#0369a1` | Available / accepting proposals |
| **ASSIGNED** / **IN_PROGRESS** | `--status-progress` | `#fffbeb` / `#b45309` / `#fde68a` | `#78350f` / `#fbbf24` / `#b45309` | Active workflow / waiting on user action |
| **UNDER_REVIEW** / **ADMIN_REVIEW** | `--status-review` | `#f5f3ff` / `#6d28d9` / `#ddd6fe` | `#4c1d95` / `#a78bfa` / `#6d28d9` | Work submitted / awaiting audit |
| **COMPLETED** / **RELEASED** / **SUCCESS** | `--status-success` | `#ecfdf5` / `#047857` / `#a7f3d0` | `#064e3b` / `#34d399` / `#047857` | Final positive state (funds dispersed) |
| **DISPUTED** | `--status-disputed` | `#fff7ed` / `#c2410c` / `#fed7aa` | `#7c2d12` / `#fb923c` / `#c2410c` | Flagged / mediator assistance requested |
| **CANCELLED** / **REFUNDED** / **FAILED** | `--status-negative` | `#fff1f2` / `#be123c` / `#fecdd3` | `#881337` / `#fb7185` / `#be123c` | Final negative state (failed check) |
| **CLOSED** | `--status-neutral` | `#f1f5f9` / `#475569` / `#cbd5e1` | `#1e293b` / `#94a3b8` / `#475569` | Project closed without delivery |

---

## 3. Dark/Light Mode Theme Selection Mechanism

- **Theme Toggle**: Cycles through **Light** ☀️ → **Dark** 🌙 → **System** 🖥️.
- **Provider**: Handled via `components/ThemeProvider.tsx`, which attaches the `.dark` class directly to the `<html>` node.
- **State Persistence**: Theme state is serialized to `localStorage` under `trustlance-theme`.
- **Theme Flash Prevention**: Root layout includes a blocking inline script in `<head>` to evaluate stored settings and append `.dark` before the first page render is painted.

---

## 4. Shapes & Layout Rules

- **Borders**: All cards use `border border-[var(--border)] rounded-xl` (12px rounded corners) for a clean modern aesthetic.
- **Shadows**: Cards and buttons use `shadow-sm` for a slight lift. Avoid harsh, dark shadow classes.
- **Icons**: Every UI illustration has been migrated from old raw emojis to modern `lucide-react` icons (e.g. `Clock`, `CreditCard`, `Shield`, `FileText`, `Globe`, `Github`).
- **Focus Rings**: Accessibilities rings are customized to `focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]` on all input fields.
