import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createSubmissionSchema } from "@/lib/validators/submission";
import { SubmissionService } from "@/lib/services/submission-service";
import { Role } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(Role.FREELANCER);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { id: projectId } = await params;
    const freelancerId = authResult.session.user.id;
    const body = await request.json().catch(() => ({}));
    const parseResult = createSubmissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const submission = await SubmissionService.submitWork(projectId, freelancerId, parseResult.data);
      return NextResponse.json(submission, { status: 201 });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Submission failed";
      if (message.includes("Forbidden")) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (message.includes("not found")) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
