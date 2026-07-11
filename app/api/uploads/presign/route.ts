import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { presignRequestSchema } from "@/lib/validators/submission";
import { generatePresignedUploadUrl } from "@/lib/storage/s3";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in first." },
        { status: 401 }
      );
    }

    const role = session.user.role;
    if (role !== Role.CLIENT && role !== Role.FREELANCER) {
      return NextResponse.json(
        { error: `Forbidden: Mismatched role. Required: CLIENT or FREELANCER, Current: ${role || "None"}.` },
        { status: 403 }
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
