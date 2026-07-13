import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  completeClientProfileSchema,
  completeFreelancerProfileSchema,
} from "@/lib/validators/user";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const userId = session.user.id;

    // Profile updates rate limit check (max 10 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyProfileUpdates = prisma.auditLog && prisma.auditLog.count
      ? await prisma.auditLog.count({
          where: {
            actorId: userId,
            action: "COMPLETE_PROFILE",
            createdAt: { gte: oneHourAgo },
          },
        })
      : 0;

    if (hourlyProfileUpdates >= 10) {
      return NextResponse.json(
        { error: "Rate limit exceeded: Maximum of 10 profile updates per hour." },
        { status: 429 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!dbUser.role) {
      return NextResponse.json(
        { error: "Bad Request: Please select a role first." },
        { status: 400 }
      );
    }

    if (dbUser.profileCompleted) {
      return NextResponse.json(
        { error: "Profile has already been completed." },
        { status: 400 }
      );
    }

    const body = await request.json();

    let validatedData;
    if (dbUser.role === Role.CLIENT) {
      const result = completeClientProfileSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed.", details: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      validatedData = {
        name: result.data.name,
        phone: result.data.phone,
        location: result.data.location,
        businessName: result.data.businessName,
      };
    } else if (dbUser.role === Role.FREELANCER) {
      const result = completeFreelancerProfileSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed.", details: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      validatedData = {
        name: result.data.name,
        phone: result.data.phone,
        location: result.data.location,
        bio: result.data.bio,
      };
    } else {
      // Admin role bypass or fallback
      validatedData = {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executeUpdate = async (client: any) => {
      await client.user.update({
        where: { id: userId },
        data: {
          ...validatedData,
          profileCompleted: true,
        },
      });

      if (client.auditLog && client.auditLog.create) {
        await client.auditLog.create({
          data: {
            entityType: "User",
            entityId: userId,
            action: "COMPLETE_PROFILE",
            actorId: userId,
          },
        });
      }
    };

    if (prisma.$transaction) {
      await prisma.$transaction(async (tx) => executeUpdate(tx));
    } else {
      await executeUpdate(prisma);
    }

    return NextResponse.json({ success: true, message: "Profile completed successfully." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Server error occurred.", details: msg }, { status: 500 });
  }
}
