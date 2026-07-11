import { prisma } from "../prisma";
import { EscrowStatus, ProjectStatus, DisputeStatus } from "@prisma/client";
import { EscrowService } from "../services/escrow-service";
import { NotificationService } from "../services/notification-service";
import { SYSTEM_ACTORS } from "../constants/actors";

export async function findEligibleProjects(graceDays = 5) {
  const threshold = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  const escrows = await prisma.escrow.findMany({
    where: {
      status: EscrowStatus.UNDER_REVIEW,
      NOT: {
        dispute: {
          status: {
            in: [DisputeStatus.OPEN, DisputeStatus.ADMIN_REVIEW],
          },
        },
      },
    },
    include: {
      project: {
        include: {
          submissions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  return escrows.filter((escrow) => {
    const latest = escrow.project?.submissions?.[0];
    if (!latest) return false;
    return latest.createdAt <= threshold;
  });
}

export async function findWarningProjects(graceDays = 5) {
  // Warning happens 24 hours (1 day) before auto-release
  const warningThreshold = new Date(Date.now() - (graceDays - 1) * 24 * 60 * 60 * 1000);
  const releaseThreshold = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);

  const escrows = await prisma.escrow.findMany({
    where: {
      status: EscrowStatus.UNDER_REVIEW,
      NOT: {
        dispute: {
          status: {
            in: [DisputeStatus.OPEN, DisputeStatus.ADMIN_REVIEW],
          },
        },
      },
    },
    include: {
      project: {
        include: {
          submissions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const candidates = escrows.filter((escrow) => {
    const latest = escrow.project?.submissions?.[0];
    if (!latest) return false;
    return latest.createdAt <= warningThreshold && latest.createdAt > releaseThreshold;
  });

  const results = [];
  for (const escrow of candidates) {
    const loggedWarning = await prisma.auditLog.findFirst({
      where: {
        entityType: "Project",
        entityId: escrow.projectId,
        action: "AUTO_RELEASE_WARNING",
      },
    });
    if (!loggedWarning) {
      results.push(escrow);
    }
  }
  return results;
}

export async function runAutoRelease(graceDays = 5): Promise<number> {
  const eligible = await findEligibleProjects(graceDays);
  let count = 0;

  for (const escrow of eligible) {
    try {
      const projectId = escrow.projectId;
      const project = escrow.project;
      if (!project) continue;

      await prisma.$transaction(async (tx) => {
        // 1. Update Project Status to COMPLETED
        await tx.project.update({
          where: { id: projectId },
          data: { status: ProjectStatus.COMPLETED },
        });

        // 2. Log project transition in AuditLog
        await tx.auditLog.create({
          data: {
            entityType: "Project",
            entityId: projectId,
            action: "TRANSITION_COMPLETED",
            actorId: SYSTEM_ACTORS.SYSTEM_AUTO_RELEASE,
            prevState: project.status,
            newState: ProjectStatus.COMPLETED,
          },
        });

        // 3. Transition Escrow Status to RELEASED (automatically creates Escrow AuditLog)
        await EscrowService.transition(
          escrow.id,
          EscrowStatus.RELEASED,
          SYSTEM_ACTORS.SYSTEM_AUTO_RELEASE,
          tx
        );
      });

      // 4. Trigger Payment Released Notification (fire and forget outside tx)
      await NotificationService.notify("PAYMENT_RELEASED", { projectId });
      count++;
    } catch (err) {
      console.error(`[AutoRelease Error] Failed to auto-release project ${escrow.projectId}:`, err);
    }
  }

  return count;
}

export async function runWarningNotifications(graceDays = 5): Promise<number> {
  const warningNeeded = await findWarningProjects(graceDays);
  let count = 0;

  for (const escrow of warningNeeded) {
    try {
      const projectId = escrow.projectId;

      // 1. Log the warning in AuditLog to prevent duplicate warnings
      await prisma.auditLog.create({
        data: {
          entityType: "Project",
          entityId: projectId,
          action: "AUTO_RELEASE_WARNING",
          actorId: SYSTEM_ACTORS.SYSTEM_AUTO_RELEASE,
          prevState: ProjectStatus.UNDER_REVIEW,
          newState: ProjectStatus.UNDER_REVIEW,
        },
      });

      // 2. Trigger warning email
      await NotificationService.notify("AUTO_RELEASE_WARNING", { projectId });
      count++;
    } catch (err) {
      console.error(`[AutoRelease Warning Error] Failed to warn project ${escrow.projectId}:`, err);
    }
  }

  return count;
}
