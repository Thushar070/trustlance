import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isWebhook = pathname.startsWith("/api/webhooks");
  const isPublicFile = pathname.includes(".") || pathname.startsWith("/_next");
  const isDevLogin = pathname.startsWith("/api/dev");

  // 1. Exclude static assets, NextAuth routes, dev logins, and webhooks
  if (isApiAuth || isPublicFile || isWebhook || isDevLogin) {
    return NextResponse.next();
  }

  // 2. If user is NOT authenticated
  if (!token) {
    if (isAuthPage || pathname === "/") {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. User IS authenticated: Resolve role and onboarding state
  const role = token.role;
  const profileCompleted = token.profileCompleted;

  const isSelectRolePage = pathname === "/select-role";
  const isSelectRoleApi = pathname === "/api/auth/select-role";
  const isCompleteProfilePage = pathname === "/complete-profile";
  const isCompleteProfileApi = pathname === "/api/users/complete-profile";

  // STATE A: Role is not selected yet
  if (!role) {
    if (isSelectRolePage || isSelectRoleApi) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Forbidden: Role selection required." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/select-role", request.url));
  }

  // STATE B: Role selected, but profile is not completed
  if (!profileCompleted) {
    if (isCompleteProfilePage || isCompleteProfileApi) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Forbidden: Profile completion required." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  }

  // STATE C: Fully onboarded user (has role and profile Completed)
  // Prevent re-visiting onboarding pages
  if (isAuthPage || isSelectRolePage || isCompleteProfilePage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Role-based Gating of Pages & API routes
  if (pathname.startsWith("/admin/")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/client/")) {
    if (role !== "CLIENT") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname === "/projects") {
    if (role === "CLIENT") {
      return NextResponse.redirect(new URL("/client/projects", request.url));
    }
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/assignments", request.url));
    }
  }

  if (pathname === "/payments") {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/assignments", request.url));
    }
  }

  // API Gating for Admin endpoints
  if (pathname.startsWith("/api/admin/")) {
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth (internal NextAuth route)
     * - _next/static (static assets)
     * - _next/image (image optimization assets)
     * - favicon.ico (favicon)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
