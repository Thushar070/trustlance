import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { ReportService } from "@/lib/services/connection-service";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    // Role gate: Only Admins can view user reports
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const reports = await ReportService.listReports();
    return NextResponse.json(reports);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
