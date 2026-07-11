# Implementation Plan: 4 New Features & Visibility Control

This plan details the design and execution path for adding:
1. Private project visibility controls (Part A)
2. Private Client-Freelancer messaging (Part B)
3. User profile pages with validation (Part C)
4. PWA installability with a custom manifest and standard sw.js (Part D)
5. Vercel deployment configuration & env audit (Part E)

---

## Proposed Changes

### Part A: Restrict Project Visibility Once Assigned

#### 1. [MODIFY] [project-service.ts](file:///home/billy/Documents/ESCROW/lib/services/project-service.ts)
- Modify `listProjects` to take an optional `currentUserId` string.
- Adjust visibility logic:
  - If a status filter is explicitly passed (e.g. `ASSIGNED`, `IN_PROGRESS`), check that it only returns projects where the user is either the client owner or the assigned freelancer.
  - If no status filter is provided, default to only `OPEN` status, unless the client is querying their own projects (i.e. `clientId` parameter matches `currentUserId`).

#### 2. [MODIFY] [route.ts](file:///home/billy/Documents/ESCROW/app/api/projects/route.ts)
- Retrieve the session using `getServerSession()`.
- Pass `session.user.id` as `currentUserId` to `ProjectService.listProjects()`.

#### 3. [MODIFY] [route.ts](file:///home/billy/Documents/ESCROW/app/api/projects/%5Bid%5D/route.ts)
- Add visibility authorization inside the project details GET route:
  - If the project status is NOT `OPEN`, check if the logged-in user is:
    - The client owner (`clientId === session.user.id`).
    - The assigned freelancer (`freelancerId === session.user.id`).
    - Admin (`session.user.role === Role.ADMIN`).
  - If none of these match, reject the request with `403 Forbidden`.

---

### Part B: Private Client-Freelancer Messaging

#### 1. [MODIFY] [schema.prisma](file:///home/billy/Documents/ESCROW/prisma/schema.prisma)
- Add the `Message` model:
  ```prisma
  model Message {
    id        String   @id @default(cuid())
    projectId String
    project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
    senderId  String
    sender    User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
    content   String
    createdAt DateTime @default(now())
  }
  ```
- Add relation fields to `User` and `Project` models:
  - `User.messages: Message[]`
  - `Project.messages: Message[]`

#### 2. [NEW] [message-service.ts](file:///home/billy/Documents/ESCROW/lib/services/message-service.ts)
- Create `MessageService` containing:
  - `sendMessage(projectId, senderId, content)`:
    - Check if project exists and is `ASSIGNED` or later (must not be `OPEN`).
    - Verify that `senderId` is the project's client or assigned freelancer.
    - Save message to the database.
  - `listMessages(projectId, userId, page, limit)`:
    - Verify that `userId` is either the client or assigned freelancer.
    - Admin is strictly denied.
    - Fetch messages sorted by `createdAt` asc (or pagination compatible).

#### 3. [NEW] [/api/projects/[id]/messages/route.ts](file:///home/billy/Documents/ESCROW/app/api/projects/%5Bid%5D/messages/route.ts)
- `POST`: Gated by session auth. Checks content and sends message.
- `GET`: Gated by session auth. Explicitly rejects Admins. Returns list.

#### 4. [MODIFY] [page.tsx](file:///home/billy/Documents/ESCROW/app/projects/%5Bid%5D/page.tsx)
- Embed a "Messages & Collaboration" chat box inside the detail view.
- Only visible if the project is `ASSIGNED` or later, and the user is either the client or freelancer.
- Polling mechanism every 6 seconds to fetch new messages.
- A "Copy Message" or "Submit as evidence instructions" block explaining how to use text as dispute evidence.

---

### Part C: User Profile Pages

#### 1. [MODIFY] [schema.prisma](file:///home/billy/Documents/ESCROW/prisma/schema.prisma)
- Add to the `User` model:
  - `phone String?`
  - `location String?`
  - `businessName String?`
  - `bio String?`

#### 2. [NEW] [user.ts](file:///home/billy/Documents/ESCROW/lib/validators/user.ts)
- Zod validation schema:
  - `name`: max 50 chars
  - `phone`: regex match `/^\+?[0-9\s\-()]{7,20}$/`
  - `location`: max 100 chars
  - `businessName`: max 100 chars
  - `bio`: max 500 chars

#### 3. [NEW] [/api/users/me/route.ts](file:///home/billy/Documents/ESCROW/app/api/users/me/route.ts)
- `PATCH`: Gated by auth. Validates input and updates `User` table for the session's user ID.

#### 4. [NEW] [/app/(dashboard)/profile/page.tsx](file:///home/billy/Documents/ESCROW/app/%28dashboard%29/profile/page.tsx)
- Client-side Profile Edit Form. Pre-filled with current user values. Editable fields, save flow.

#### 5. [MODIFY] [Navbar.tsx](file:///home/billy/Documents/ESCROW/components/Navbar.tsx)
- Add "Profile" link (using Lucide `User` icon) in Navbar next to sign-out button.

---

### Part D: PWA Installability

#### 1. [NEW] [manifest.json](file:///home/billy/Documents/ESCROW/public/manifest.json)
- Standard manifest file pointing to icon shapes:
  - `theme_color`: `#4338ca` (Deep indigo brand accent)
  - `background_color`: `#f8fafc`
  - `icons`: PWA 192x192 and 512x512 icons (copied from generated logo).

#### 2. [NEW] [sw.js](file:///home/billy/Documents/ESCROW/public/sw.js)
- Hand-written minimal Service Worker with dummy pass-through fetch handler for installability checks, containing zero caching (since offline cache is out of scope).

#### 3. [MODIFY] [Providers.tsx](file:///home/billy/Documents/ESCROW/components/Providers.tsx)
- Register service worker `sw.js` on client mounting.

#### 4. [MODIFY] [layout.tsx](file:///home/billy/Documents/ESCROW/app/layout.tsx)
- Link the PWA manifest: `<link rel="manifest" href="/manifest.json" />` and define `<meta name="theme-color" ...>` tags.

---

### Part E: Vercel Configuration & Environment

#### 1. [NEW] [vercel.json](file:///home/billy/Documents/ESCROW/vercel.json)
- Set up Vercel Crons executing `/api/admin/run-auto-release` daily.

#### 2. [MODIFY] [route.ts](file:///home/billy/Documents/ESCROW/app/api/admin/run-auto-release/route.ts)
- Update auto-release API to accept `Authorization: Bearer ${process.env.CRON_SECRET}` checks, allowing external Vercel Cron requests to trigger it safely.

#### 3. [MODIFY] [.env.example](file:///home/billy/Documents/ESCROW/.env.example)
- Add all variables, e.g., `CRON_SECRET`, `RESEND_API_KEY`, etc.

#### 4. [NEW] [DEPLOYMENT_CHECKLIST.md](file:///home/billy/Documents/ESCROW/docs/DEPLOYMENT_CHECKLIST.md)
- Checklist for environment configuration, OAuth callback setup, Razorpay hooks, and migration deployment steps.

---

## Verification Plan

### Automated Integration & Unit Tests
Write comprehensive tests in `__tests__/new-features.test.ts`:
- **Visibility Checks**:
  - Test that non-OPEN projects do not appear in public listing.
  - Test that non-related users get 403 Forbidden accessing project details by ID directly.
  - Test that project owners and assigned freelancers can access it normally.
- **Messaging Security**:
  - Test that only client and freelancer can send/receive messages.
  - Test that messaging is rejected on OPEN projects.
  - Test that Admins are rejected from accessing `/api/projects/:id/messages` under all circumstances.
- **Profiles**:
  - Test profile update validations (Zod validations, malformed phone check).
  - Test profile edit permissions (prevent editing other users).

### Manual Verification
- Test PWA manifest in dev tools / Lighthouse auditing for installability prompts.
- Ensure `npm run lint` and `npm run build` run successfully with zero errors.
