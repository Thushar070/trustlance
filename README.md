# TrustLance — Secure Escrow Freelance Marketplace

TrustLance is a production-grade, secure freelance marketplace featuring integrated application-level escrow-style payment protection, dispute resolution boards, and a network social directory. 

The application is built using Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM (with PostgreSQL), NextAuth.js, Razorpay payment gateway integrations, and SendGrid mail systems.

---

## 1. Product Summary & User Roles

TrustLance operates with three primary, distinct user roles:

### A. Client
* **Capabilities**:
  - Create and fund projects by depositing escrow balances (milestones).
  - Review submitted proposals from freelancers.
  - Select and assign freelancers to start a contract.
  - Access private workspaces for real-time project messaging.
  - Request modifications or approve deliverables to release escrow funds.
  - Escalate unresolved disputes to system administrators.
  - Submit bidirectional reputation ratings and reviews upon completion.

### B. Freelancer
* **Capabilities**:
  - Search and browse open projects in the marketplace directory.
  - Submit proposals with optional counter-offer pricing.
  - Access private contract workspaces upon selection.
  - Upload files and links to submit milestones.
  - Raise disputes if work is rejected or funds are withheld.
  - Rate and review clients after project release.
  - Build professional networks via bidirectional connection requests.

### C. Admin
* **Capabilities**:
  - Adjudicate active disputes (options: release to freelancer, refund to client, or split).
  - Monitor aggregate statistics (total users, active escrows, total value locked).
  - Inspect profile flag/violation reports.
  - Audit system-wide action histories via database audit logs.

---

## 2. Design System

The platform uses a high-contrast Indigo-based theme, featuring a strict black-and-white color layout to ensure visual clarity.

*   **Background (Light/Dark)**: `#F8FAFC` (Slate Tint) / `#000000` (True Black)
*   **Surface**: `#FFFFFF` / `#111111` (Near Black)
*   **Surface Elevated**: `#FFFFFF` / `#1a1a1a` (Dark Gray)
*   **Accent Primary**: `#4F46E5` (Indigo) / `#6366F1` (Light Indigo)
*   **Typography**: Inter / Sans-serif system default, using strict font and spacing scales.
*   **Icons**: Lucide-React exclusively.

---

## 3. Technology Stack

*   **Framework**: Next.js 16.2.10 (App Router)
*   **Database**: PostgreSQL hosted on Neon, managed via Prisma ORM
*   **Authentication**: NextAuth.js (Session-based, with credentials and Google OAuth provider support)
*   **Payment Gateway**: Razorpay (Checkout & Orders API, verified with signature checking and webhook handlers)
*   **File Storage**: AWS S3 (Presigned URLs for secure file uploads)
*   **Emailing Service**: SendGrid (Transactional emails for onboarding, milestones, payments, and disputes)
*   **Testing**: Jest + ts-jest

---

## 4. Database Setup & Seeding

### Seeding Accounts
The database contains pre-configured test overrides with pre-completed user profiles. 

| Role | Email | Description | Profile Details |
|---|---|---|---|
| **Admin** | `thusharyyy@gmail.com` | System administrator account | Pre-completed profile |
| **Client** | `thushar2410612@ssn.edu.in` | Client test account | Pre-completed business profile |
| **Freelancer** | `thushar.tl.dev@gmail.com` | Freelancer test account | Pre-completed skills/bio profile |

### Setup Instructions
1. Initialize database schema:
   ```bash
   npx prisma db push
   ```
2. Populate the database seed overrides:
   ```bash
   npx prisma db seed
   ```

---

## 5. Local Development Setup

Follow these steps to run the application locally:

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Provide valid keys for Database, NextAuth, SendGrid, Razorpay, and AWS S3.
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the homepage.

---

## 6. Vercel Deployment Guide

To deploy this project to Vercel:

1. Import the repository in the Vercel Dashboard.
2. In the **Build and Output Settings**, keep all commands at their default values. The build command will automatically run:
   ```bash
   npm run build
   ```
   (which triggers `prisma generate && next build` as configured in `package.json`).
3. Add the following **Environment Variables** under the project settings:
   - `DATABASE_URL` (Neon PostgreSQL database URL)
   - `NEXTAUTH_SECRET` (Random secret key)
   - `NEXTAUTH_URL` (Your production Vercel domain, e.g., `https://your-project.vercel.app`)
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` (For OAuth)
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` & `AWS_S3_BUCKET_NAME`
   - `SENDGRID_API_KEY`
   - `EMAIL_FROM_ADDRESS` & `EMAIL_FROM_NAME`

---

## 7. Verification & Quality Commands

Ensure all checks pass before submitting pull requests:

*   **Lint Checking**:
    ```bash
    npm run lint
    ```
*   **Testing Suites**:
    ```bash
    npm test
    ```
