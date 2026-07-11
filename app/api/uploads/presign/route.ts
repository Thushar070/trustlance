import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { presignRequestSchema } from "@/lib/validators/submission";
import { generatePresignedUploadUrl } from "@/lib/storage/s3";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(Role.FREELANCER);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = presignRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fileName, contentType } = parseResult.data;

    const presignedData = await generatePresignedUploadUrl(fileName, contentType);
    return NextResponse.json(presignedData, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
