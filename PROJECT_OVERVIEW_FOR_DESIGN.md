# TrustLance Product & UI/UX Overview

This document provides a comprehensive blueprint of the TrustLance platform from a product and design perspective. It details user roles, the established design system, page inventory, primary user flows, data concepts, and status vocabularies. This documentation serves as a direct specifications outline for AI user interface generation tools (such as Google Stitch) to construct aligned and cohesive screen designs.

---

## 1. Product Summary

TrustLance is a secure freelance marketplace featuring integrated escrow-style payment protection, dispute resolution mechanisms, and a professional-network layer. The product allows clients to post projects, fund escrow balances securely, evaluate proposals, and collaborate with freelancers. Freelancers can apply to projects, negotiate counter-offer rates, submit deliverables, and communicate via real-time project workboards. The professional layer integrates user search directories, bidirectional connection networks, and bidirectional project feedback profiles to foster marketplace trust, credibility, and accountability.

---

## 2. User Roles

TrustLance operates with three distinct user roles. The interface must reflect the specific action permissions and boundaries of each role.

### A. Client
* **Core Capabilities**:
  - Create and fund new projects by depositing escrow balances.
  - Review submitted proposals and freelancer profile cards.
  - Select a freelancer to assign to a project, starting the contract.
  - Access the private project workspace to communicate via chat.
  - Request modifications or approve submitted deliverables.
  - Raise disputes if work fails to meet agreed requirements.
  - Rate and leave review comments for the freelancer upon project completion.
  - Flag/report problematic user profiles to system administrators.
* **Core Restrictions**:
  - Cannot browse other clients' projects or private workboards.
  - Cannot search for or view other clients' proposal applications.
  - Cannot submit proposals to open projects or bid on jobs.
  - Cannot access system administration queues (Overview stats, Disputes queue, Profile Flag Reports console, or global Assignments ledger).
  - Cannot adjudicate disputes or directly disperse contested funds.

### B. Freelancer
* **Core Capabilities**:
  - Search and browse open project postings in the marketplace directory.
  - Submit proposals to open projects with optional counter-offer pricing.
  - Access the private project workspace to communicate via chat upon selection.
  - Upload file attachments and links to submit deliverables.
  - Raise disputes if work is rejected or escrow funds are withheld.
  - Rate and leave review comments for the client upon project completion.
  - Send and accept connection requests from other users.
  - Submit flag/violation reports on profiles.
* **Core Restrictions**:
  - Cannot post projects or create escrow balances.
  - Cannot view other freelancers' proposals on the same project.
  - Cannot select or assign freelancers to projects.
  - Cannot release escrow funds or adjudicate active disputes.
  - Cannot view system administration dashboards.

### C. Admin
* **Core Capabilities**:
  - View aggregate marketplace statistics (total users, active projects, active escrows, open disputes, total value in escrow).
  - Monitor the global system assignments directory (listing all ongoing contracts, agreed amounts, and current statuses).
  - Access the open disputes queue to review unresolved conflicts.
  - Adjudicate active disputes by releasing escrow funds to the freelancer, refunding the client, or initiating split settlements.
  - View profile flag reports submitted by marketplace users and inspect flagged accounts.
  - Read system-wide audit logs detailing database and contract transition histories.
* **Core Restrictions**:
  - Cannot post projects or bid on jobs.
  - Cannot select freelancers or assign workers on behalf of clients.
  - Cannot participate in standard marketplace transactions.
  - Cannot view private chat workspace threads or project files unless a dispute is active.

---

## 3. Design System Already Established

All interface designs must adhere to the established visual language to ensure consistency across the dark and light theme options.

### A. Color Palette
TrustLance uses a high-contrast Indigo-based theme, using a strict true-black color palette in Dark Mode.

| Context / Token | Light Mode Value | Dark Mode Value | Design Application |
|---|---|---|---|
| **Background** | `#F8FAFC` (Slate Tint) | `#000000` (True Black) | Primary canvas background |
| **Surface** | `#FFFFFF` (White) | `#111111` (Near Black) | Card panels and surface areas |
| **Surface Elevated** | `#FFFFFF` (White) | `#1a1a1a` (Dark Gray) | Dropdowns, modals, overlays |
| **Surface Subtle** | `#F8FAFC` (Slate Tint) | `#0a0a0a` (Deep Slate) | Secondary layout panels |
| **Accent Primary** | `#4F46E5` (Indigo) | `#6366F1` (Light Indigo) | Buttons, focus indicators, highlights |
| **Accent Hover** | `#3730A3` (Deep Indigo) | `#4F46E5` (Indigo) | Hover states for primary actions |
| **Accent Light** | `#EEF2FF` (Indigo Tint) | `rgba(99, 102, 241, 0.12)` | Badge backgrounds and tinted alerts |
| **Border** | `rgba(15, 23, 42, 0.08)` | `rgba(255, 255, 255, 0.08)` | Divider lines and card containers |
| **Border Subtle** | `rgba(15, 23, 42, 0.04)` | `rgba(255, 255, 255, 0.04)` | Nested dividers and subtle lines |
| **Text Primary** | `#0F172A` (Slate 900) | `#f5f5f5` (Off-White) | Main headings and body text |
| **Text Secondary** | `#64748B` (Slate 500) | `#a0a0a0` (Muted Gray) | Sub-labels, metadata, secondary text |
| **Text Muted** | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Timestamps, placeholders, disabled states |

### B. Typography & Spacing Scales
* **Font Family**: Standard, legible sans-serif (Inter/system default).
* **Font Sizes**: Large titles for primary views (24px/bold), sub-headings (18px/semibold), utility labels (12px/uppercase/bold), body text (14px/regular), metadata text (12px/regular).
* **Layout Spacing**: Grid gutters use 24px spacing. Page containers implement standard desktop margins (`max-w-7xl mx-auto px-6` or `max-w-4xl` for settings/details).
* **Corner Radius**: Card elements and form inputs use soft rounded borders (12px to 16px).

### C. Icon Library
* **Lucide-React** is the exclusive icon library. Use icons systematically for navigation tabs, action buttons, alert boxes, and status badges.

---

## 4. Full Page Inventory

Every screen route in the application is cataloged below, detailing its access permissions, content layout, and interactive requirements.

### A. Public & Authentication Pages
1. **Landing / Welcome Page**
   - *Purpose*: Welcome visitors, showcase platform features, and drive sign-ups.
   - *Access*: Guest (Unauthenticated).
   - *Content*: Hero section, payment protection benefits, how it works visual cards, testimonials, and "Get Started" links.
   - *Interactions*: Login and signup navigation links.
2. **Login / Authentication Screen**
   - *Purpose*: Securely authenticate users.
   - *Access*: Guest.
   - *Content*: Clean authentication card with email text input.
   - *Interactions*: Email input field and "Send Magic Link" submission button.

### B. Onboarding & Registration Pages
1. **Select Role Screen**
   - *Purpose*: Force fresh accounts to choose a role pathway.
   - *Access*: Authenticated users with no role assigned.
   - *Content*: Two high-impact visual selector cards: "I want to Hire Talent" (Client) and "I want to Work" (Freelancer).
   - *Interactions*: Role card selection actions.
2. **Complete Profile Screen**
   - *Purpose*: Capture profile details before granting workspace access.
   - *Access*: Authenticated users with incomplete profiles.
   - *Content*: Dynamic form based on role. Clients enter business name, phone number, location, and bio description. Freelancers enter phone, location, a list of tags representing skills, and bio description.
   - *Interactions*: Profile inputs and a "Save and Complete Profile" button.

### C. Client-Specific Pages
1. **Client My Projects Page**
   - *Purpose*: Lists all projects posted by the client.
   - *Access*: Client.
   - *Content*: A multi-tab dashboard displaying created projects grouped by status (Open, Active Contracts, Completed, Closed).
   - *Interactions*: Tab selectors, card filters, and a prominent "+ Post New Project" button.
2. **Post Project & Checkout Form**
   - *Purpose*: Post and fund a new escrow-protected project.
   - *Access*: Client.
   - *Content*: Forms to fill in project details (Title, Description, Budget, Deadline calendar, Skills tags). Integrates checkout payment actions to secure project funding.
   - *Interactions*: Title input, description editor, budget text box, deadline selector, skills tag entry field, and a "Fund Escrow & Post Project" checkout button.

### D. Freelancer-Specific Pages
1. **Marketplace Browse Projects Page**
   - *Purpose*: Allow freelancers to find open jobs.
   - *Access*: Freelancer.
   - *Content*: Search bar, filter drawer panel (filtering by budget range, skills, and keyword), and cards showing project title, client name, description snippet, budget, and deadline.
   - *Interactions*: Search query input, filter toggles, slide-out drawer triggers, and "View Details" links.

### E. Shared Dashboard Pages
1. **Search Directory Page**
   - *Purpose*: Browse platform participants to build professional networks.
   - *Access*: Client, Freelancer.
   - *Content*: Keyword input, skill filters, minimum reputation star rating dropdown, and result user cards showing user name, business name, average star rating, completed projects count, location, and top skill tags. Contains a sorting toolbar to sort results by Rating (default) or Recent Activity.
   - *Interactions*: Search submit, rating selectors, sort toggles, and "View Public Profile" triggers.
2. **Public Profile detail Screen**
   - *Purpose*: Public portfolio page showcasing user details, ratings, and connection triggers.
   - *Access*: Client, Freelancer, Admin.
   - *Content*:
     - Header: Name, business name, location, role badge.
     - Metrics: Reputation rating (stars out of 5), completed projects counter.
     - Main: Bio summary, endorsements list, and feedback history log cards (with reviewer names, roles, stars, and comments).
     - Security Box: A locked credentials card displaying either masked details ("Contact credentials are encrypted") or decrypted details (Email, Phone) if the viewer has an active project relationship or an accepted connection request.
     - Actions: A dynamic connection action button (Connect, Request Pending, Accept/Decline options, or Connected), and a "Report User" violation flagging button.
   - *Interactions*: Connection triggers, Accept/Decline action links, "Report User" button opening a glassmorphic description modal form.
3. **Connections Manager Inbox**
   - *Purpose*: Manage network invitations and active social circles.
   - *Access*: Client, Freelancer.
   - *Content*:
     - "My Network" Tab: List of accepted connection cards with user avatar, name, business details, location, and a direct profile link.
     - "Pending Invites" Tab: Chronological list of incoming requests showing requester details and Accept/Decline action buttons.
   - *Interactions*: Tab selectors, profile navigators, and Accept/Decline action triggers.
4. **Payments Ledger Page**
   - *Purpose*: Financial audit dashboard showing payment histories.
   - *Access*: Client, Freelancer.
   - *Content*:
     - Metrics Summary: Three top statistics cards displaying Total Paid/Received (dynamic based on role), Pending Escrow, and Completed Transfers count.
     - History List: Responsive layout displaying detailed transaction items (Project title link, transaction amount, colored status badge, and date-time). Adapts from desktop tables to mobile-friendly cards. Sorted descending by creation date.
     - Empty State: Clean vector illustration displaying when no transactions exist.
   - *Interactions*: Project link clicks.
5. **Project Workspace Cockpit Page**
   - *Purpose*: The primary contract execution workspace.
   - *Access*: Client, Freelancer, Admin.
   - *Content*:
     - Header: Project title, status badge, budget, and deadline counter.
     - Workspace Tabs:
       1. **Project Details**: Description, required skills, and proposals queue (displayed only to the client while the project status is Open).
       2. **Work Board**: Displays current contract status, file/link uploads, and history log.
       3. **Private Chat**: Real-time communication channel.
     - Review Decision Card: Visible only to Clients when work is submitted. Contains decision buttons: "Approve and Release Funds", "Request Changes", and "Raise Dispute".
     - Feedback Log Card: Chronological revisions log with client revision comments.
     - Rating Forms: Bidirectional review text box and star selectors visible after escrow release.
   - *Interactions*: Send message input, file/link upload dropzone, submit work trigger, client review action buttons, rating feedback forms, and dispute escalation link.

### F. Dispute Board Pages
1. **Dispute Resolution Board**
   - *Purpose*: Contest project work and submit evidence logs.
   - *Access*: Client, Freelancer, Admin.
   - *Content*:
     - Dispute Header: Contest reason, date, and status.
     - Evidence Queue: Lists uploaded files, screenshots, and comments from both sides.
     - Adjudication Card: Visible only to Admins. Contains resolution notes text field, action buttons (Release to Freelancer vs. Refund to Client), and a dynamic inline confirmation box outlining chosen outcomes.
   - *Interactions*: Evidence attachment upload inputs, admin text entries, inline resolution confirmation triggers.

### G. Admin-Only Control Pages
1. **Admin Overview Stats Page**
   - *Purpose*: System health monitoring and audit logging.
   - *Access*: Admin.
   - *Content*:
     - Statistics Grid: Total users, active projects, active escrows, open disputes, total value in escrow.
     - Status Distribution: Progress indicators showing count ratios of project states.
     - Global Audit Logs: A list of platform audit events detailing entities, changes, actor names, and timestamps.
   - *Interactions*: Log filters and date search inputs.
2. **Admin Assignments ledger**
   - *Purpose*: Monitor active contracts.
   - *Access*: Admin.
   - *Content*: Responsive grid/table showing Project title, client name, freelancer name, agreed contract amounts, status badge, and date.
   - *Interactions*: Project view links.
3. **Admin Disputes Queue**
   - *Purpose*: Mediator queue of unresolved conflicts.
   - *Access*: Admin.
   - *Content*: Oldest-first chronological queue list of active disputes showing title, client, freelancer, disputed amount, days open, and status badge.
   - *Interactions*: "Review Dispute" board navigators.
4. **Admin Profile Flag Reports Console**
   - *Purpose*: Audit reported user accounts.
   - *Access*: Admin.
   - *Content*: Chronological list cards showing reported user name, reporter user name, report reason description text box, report date-time, and public profile link.
   - *Interactions*: Profile inspection triggers.

---

## 5. Core User Flows

A designer must understand the following end-to-end user journeys when building screens:

```
[Flow A: Standard Work Lifecycle]
Post Project & Fund Escrow -> Proposal & Counter-offer -> Selection & Assignment -> Chat Workspace -> Deliverables Upload & Submission -> Client Review & Approval -> Escrow Released -> Bidirectional Rating Reviews

[Flow B: Dispute Adjudication]
Work Submitted -> Dispute Triggered -> Status set to DISPUTED -> Evidence Upload (Both Sides) -> Admin Review -> Adjudication Confirmation -> Escrow Released or Refunded -> Status Resolved

[Flow C: Discovery & Connection Network]
Search Users Directory -> Public Profile (Credentials Masked) -> Outgoing Connect (Rate Limited) -> Incoming Invite Notification -> Inbox Invitation Accepted -> Decrypted Contact Box Revealed
```

### Flow 1: Standard Project Lifecycle
1. **Post**: Client fills the post-project form, undergoes Razorpay checkout, and funds the project escrow. (Status: `OPEN`, Escrow: `CREATED`).
2. **Bid**: Freelancers browse open projects, fill in proposal inputs, specify counter-offer price, and submit.
3. **Select**: Client views proposals list inside the project details tab, discusses specs in project chat, selects one proposal, and accepts the counter-offer. (Status: `ASSIGNED`, Escrow: `HOLDING`).
4. **Deliver**: Freelancer uploads code zip/documentation PDF, enters notes, and clicks submit. (Status: `UNDER_REVIEW`, Escrow: `WORK_SUBMITTED`).
5. **Approve**: Client checks deliverables inside the work board tab, clicks "Approve & Release". (Status: `COMPLETED`, Escrow: `RELEASED`).
6. **Rate**: Both users fill in rating forms (1-5 stars and feedback comments).

### Flow 2: Dispute Adjudication Path
1. **Deliver**: Freelancer submits deliverables. (Status: `UNDER_REVIEW`, Escrow: `WORK_SUBMITTED`).
2. **Escalate**: Client reviews work, rejects quality, and clicks "Raise Dispute". (Status: `UNDER_REVIEW`, Escrow: `DISPUTED`).
3. **Evidence**: Both client and freelancer access the dispute resolution board page, upload evidence attachments, screenshots, and comments. (Dispute Status: `ADMIN_REVIEW`).
4. **Resolve**: Admin reviews the dispute, enters resolution notes, chooses "Release to Freelancer" or "Refund to Client", verifies the inline confirmation details, and submits. (Escrow: `RELEASED` or `REFUNDED`, Dispute Status: `RESOLVED`).

### Flow 3: Professional Discovery & Network Connection
1. **Search**: Client visits search page, types in keywords, selects minimum rating, and submits. Results display sorted by rating.
2. **Inspect**: Client clicks "View Public Profile" on a card. Profile fields show locked, masking contact credentials.
3. **Request**: Client clicks "Connect". Outgoing invite is registered. Action button shifts to "Request Pending".
4. **Accept**: Freelancer receives connection invite notification, opens connections inbox, and clicks "Accept".
5. **Reveal**: Both profiles decrypt contact cards. Public profile contact cards show direct Email and Phone numbers.

---

## 6. Data Concepts a Designer Needs to Understand

The following concepts drive the behavior of the interface:

* **Project Status vs. Escrow Status**:
  - A project's status represents its general workflow lifecycle (Open, Assigned, Completed, etc.).
  - An escrow's status represents the financial state of the project funds (Created, Holding, Work Submitted, Disputed, Released, Refunded).
  - Both require separate, distinct status badge treatments.
* **Counter-Offer Amounts**:
  - Freelancers can request custom rates in their proposals. If accepted, this agreed amount overrides the original project budget and is displayed as the project's contract value.
* **Encryption Boundary**:
  - Phone numbers and emails are masked by default. The system only reveals these details when there is a verified contract, active proposal, or accepted connection request between the two users.
* **Bidirectional Ratings**:
  - Ratings can only be submitted after a project is completed. Ratings are private until both sides submit, preventing retaliatory reviews.
* **Uncompleted Profile Redirect**:
  - If a user signs in but has not completed their profile, they are redirected to `/select-role` or `/complete-profile`. All other paths are locked out.

---

## 7. Status & State Vocabulary

To prevent confusion, utilize the following status terms and color systems:

### A. Project Status
* **OPEN** (Indigo/Blue): Project is active in the directory, accepting applications.
* **ASSIGNED** (Amber/Gold): Freelancer selected, contract started.
* **UNDER_REVIEW** (Indigo/Blue): Deliverables submitted, client evaluating.
* **COMPLETED** (Emerald/Green): Terminal success. Work approved.
* **CLOSED** (Slate/Gray): Project ended without deliverables.

### B. Escrow Status
* **CREATED** (Indigo/Blue): Escrow record initialized, awaiting funding.
* **HOLDING** (Amber/Gold): Funds deposited, held in trust.
* **WORK_SUBMITTED** (Indigo/Blue): Deliverables uploaded, awaiting client review.
* **RELEASED** (Emerald/Green): Terminal success. Funds disbursed to freelancer.
* **DISPUTED** (Amber/Gold): Work contested, awaiting admin mediation.
* **REFUNDED** (Red): Terminal reversal. Funds returned to client.

### C. Dispute Status
* **OPEN** (Indigo/Blue): Conflict initialized, gathering evidence.
* **ADMIN_REVIEW** (Amber/Gold): Evidence submitted, admin evaluating.
* **RESOLVED** (Emerald/Green): Adjudicated, transaction closed.

### D. Proposal Status
* **PENDING** (Indigo/Blue): Application submitted, client review pending.
* **ACCEPTED** (Emerald/Green): Selected for the contract.
* **REJECTED** (Red): Declined by the client.

### E. Connection Status
* **PENDING** (Indigo/Blue): Invite sent, awaiting response.
* **ACCEPTED** (Emerald/Green): Connection active, network linked.
* **DECLINED** (Red): Invitation declined.

---

## 8. Responsive & Platform Requirements

* **Responsive Viewports**:
  - Mobile (375px): Stacks three-column grids into single-column vertical cards. Uses slide-out hamburger sidebars instead of horizontal navs.
  - Tablet (768px): Adapts card layouts and condenses high-density text fields.
  - Desktop (1024px to 1920px): Grid displays, side-by-side columns, and avatar dropdown navigation.
* **Progressive Web App (PWA)**: The app is installable and should load asset frames quickly.
* **Dark Mode**: True-black layouts (`#000000`) instead of blue/navy. Containers use high-opacity contrast overlays.

---

## 9. Tone & Personality Per Section

* **Marketplace (Browse/Search)**: Energetic, professional, collaborative, trust-building. Emphasizes rating reviews and contract completion counts.
* **Escrow Workspaces & Payments**: Calm, secure, precise, bank-statement-like. Clear numbers, explicit fee splits, and absolute confirmation.
* **Dispute Resolution Boards**: Serious, neutral, structured, objective. Focuses on document listings, evidence columns, and clear choices.
* **Admin Dashboards**: Dense, data-forward, analytical. Prioritizes global log counts, progress ratios, and quick audit routes.

---

## 10. What NOT to Change

* **Private Workspace Boundaries**: The message threads, deliverables logs, and chat elements must remain visually isolated from the public directory.
* **Security & masking alerts**: Encrypted details cards must retain a consistent lock/shield metaphor across all roles.
* **Role-Based Navigation Gating**: Do not alter route accessibility limits (e.g. Clients have no access to browse projects, Freelancers have no access to project counters, Admins are restricted from bidding).
* **Theme Toggle Cycle**: Cycle order remains Light → Dark → System.
