import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";

const selectRoleSchema = z.object({
  role: z.enum([Role.CLIENT, Role.FREELANCER]),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = selectRoleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid role selected. Must be CLIENT or FREELANCER." }, { status: 400 });
    }

    const { role } = parseResult.data;

    // Fetch latest user data to check if a role is already set
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.role) {
      return NextResponse.json({ error: "Role has already been assigned and cannot be changed." }, { status: 400 });
    }

    // Persist role update
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
