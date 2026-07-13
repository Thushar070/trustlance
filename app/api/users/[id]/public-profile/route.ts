import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, ConnectionStatus } from "@prisma/client";
import { ConnectionService } from "@/lib/services/connection-service";

// Checks if a project relationship exists (active/past assignment or proposal)
async function hasProjectRelationship(viewerId: string, profileUserId: string): Promise<boolean> {
  // Check active/past assignments
  const assignmentCount = await prisma.project.count({
    where: {
      OR: [
        { clientId: viewerId, freelancerId: profileUserId },
        { clientId: profileUserId, freelancerId: viewerId },
      ],
    },
  });
  if (assignmentCount > 0) return true;

  // Check proposals
  const proposalCount = await prisma.proposal.count({
    where: {
      OR: [
        { freelancerId: viewerId, project: { clientId: profileUserId } },
        { freelancerId: profileUserId, project: { clientId: viewerId } },
      ],
    },
  });
  return proposalCount > 0;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const viewerId = session.user.id;
    const { id: profileUserId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: profileUserId },
      include: {
        proposals: {
          include: {
            project: {
              select: {
                skills: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Extract skills-via-proposals
    const skills = Array.from(new Set(user.proposals.flatMap((p) => p.project?.skills || [])));

    // Completed project count
    let completedProjectCount = 0;
    if (user.role === Role.FREELANCER) {
      completedProjectCount = await prisma.project.count({
        where: {
          freelancerId: user.id,
          status: "COMPLETED",
        },
      });
    } else if (user.role === Role.CLIENT) {
      completedProjectCount = await prisma.project.count({
        where: {
          clientId: user.id,
          status: "COMPLETED",
        },
      });
    }

    // Average rating
    const ratings = await prisma.rating.findMany({
      where: { rateeId: user.id },
      select: { score: true },
    });
    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = ratings.length > 0 ? parseFloat((totalScore / ratings.length).toFixed(1)) : 0;

    // Get feedback reviews/comments (hide reviewer emails/phones)
    const dbReviews = await prisma.rating.findMany({
      where: { rateeId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const reviews = await Promise.all(
      dbReviews.map(async (r) => {
        const rater = await prisma.user.findUnique({
          where: { id: r.raterId },
          select: { name: true, role: true },
        });
        return {
          id: r.id,
          score: r.score,
          comment: r.comment,
          createdAt: r.createdAt,
          raterName: rater?.name || "Anonymous User",
          raterRole: rater?.role || "USER",
        };
      })
    );

    const conn = await ConnectionService.getConnectionStatus(viewerId, profileUserId);

    // Visibility rule check: owner, associated users, or accepted connection partners see full details
    const isOwner = viewerId === profileUserId;
    const isAssociated =
      isOwner ||
      (await hasProjectRelationship(viewerId, profileUserId)) ||
      conn.status === ConnectionStatus.ACCEPTED;

    const responseData: {
      id: string;
      name: string | null;
      role: Role | null;
      businessName: string | null;
      bio: string | null;
      location: string | null;
      skills: string[];
      averageRating: number;
      completedProjectCount: number;
      reviews: Array<{
        id: string;
        score: number;
        comment: string | null;
        createdAt: Date;
        raterName: string;
        raterRole: string;
      }>;
      email?: string | null;
      phone?: string | null;
      isContactVisible: boolean;
      connection: {
        status: string;
        id: string | null;
        requesterId: string | null;
      };
    } = {
      id: user.id,
      name: user.name,
      role: user.role,
      businessName: user.businessName,
      bio: user.bio,
      location: user.location,
      skills,
      averageRating,
      completedProjectCount,
      reviews,
      isContactVisible: false,
      connection: conn,
    };

    if (isAssociated) {
      responseData.email = user.email;
      responseData.phone = user.phone;
      responseData.isContactVisible = true;
    } else {
      responseData.isContactVisible = false;
    }

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
