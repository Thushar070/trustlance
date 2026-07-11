import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { Role } from "@prisma/client";
import { runAutoRelease, runWarningNotifications } from "@/lib/cron/auto-release";

export async function POST() {
  try {
    const auth = await requireRole(Role.ADMIN);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden" },
        { status: auth.status || 403 }
      );
    }

    const released = await runAutoRelease();
    const warned = await runWarningNotifications();

    return NextResponse.json({
      success: true,
      released,
      warned,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
