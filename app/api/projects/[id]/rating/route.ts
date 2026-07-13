import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { id: projectId } = await params;
    const raterId = session.user.id;

    // Rate limit check: max 5 ratings per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const minuteRatingCount = prisma.rating && prisma.rating.count
      ? await prisma.rating.count({
          where: {
            raterId,
            createdAt: { gte: oneMinuteAgo },
          },
        })
      : 0;

    if (minuteRatingCount >= 5) {
      return NextResponse.json(
        { error: "Rate limit exceeded: Maximum of 5 ratings per minute." },
        { status: 429 }
      );
    }

    // Fetch project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Ensure project is completed
    if (project.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Ratings can only be submitted for completed projects." },
        { status: 400 }
      );
    }

    // Identify rateeId and validate association
    let rateeId = "";
    if (raterId === project.clientId) {
      if (!project.freelancerId) {
        return NextResponse.json({ error: "Cannot rate: No freelancer assigned to this project." }, { status: 400 });
      }
      rateeId = project.freelancerId;
    } else if (raterId === project.freelancerId) {
      rateeId = project.clientId;
    } else {
      return NextResponse.json({ error: "Forbidden: You are not a participant in this project." }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json().catch(() => ({}));
    const score = parseInt(body.score);
    const comment = body.comment || null;

    if (isNaN(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "Score must be an integer between 1 and 5." }, { status: 400 });
    }

    // Check unique constraint manually to return user-friendly error
    const existing = await prisma.rating.findUnique({
      where: {
        projectId_raterId: {
          projectId,
          raterId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Forbidden: You have already rated this project." }, { status: 400 });
    }

    // Save rating
    const rating = await prisma.rating.create({
      data: {
        projectId,
        raterId,
        rateeId,
        score,
        comment,
      },
    });

    return NextResponse.json(rating);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
