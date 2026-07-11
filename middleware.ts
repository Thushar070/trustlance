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

  // Allow static files, auth endpoints, webhooks, etc.
  if (isApiAuth || isPublicFile || isWebhook) {
    return NextResponse.next();
  }

  // If user is NOT authenticated
  if (!token) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    // API requests return 401 JSON, regular page requests redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // User IS authenticated
  const hasRole = token.role !== null && token.role !== undefined;
  const isSelectRolePage = pathname === "/select-role";
  const isSelectRoleApi = pathname === "/api/auth/select-role";

  if (!hasRole) {
    // Redirect to select-role page if no role selection exists yet
    if (!isSelectRolePage && !isSelectRoleApi) {
      return NextResponse.redirect(new URL("/select-role", request.url));
    }
    return NextResponse.next();
  }

  // User has a role already: prevent re-visiting login or role-selection
  if (isAuthPage || isSelectRolePage) {
    return NextResponse.redirect(new URL("/", request.url));
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
