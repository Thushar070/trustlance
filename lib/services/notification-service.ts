import { prisma } from "../prisma";
import { SendGridService } from "../email/sendgrid";

export type NotificationEvent =
  | "PAYMENT_RECEIVED"
  | "FREELANCER_ASSIGNED"
  | "WORK_SUBMITTED"
  | "CHANGES_REQUESTED"
  | "DISPUTE_RAISED"
  | "DISPUTE_RESOLVED"
  | "PAYMENT_RELEASED"
  | "REFUND_ISSUED"
  | "AUTO_RELEASE_WARNING"
  | "PROPOSAL_SUBMITTED"
  | "CONNECTION_REQUEST_RECEIVED"
  | "CONNECTION_ACCEPTED"
  | "NEW_PROJECT_FROM_CONNECTION";

export interface NotificationPayload {
  projectId?: string;
  feedback?: string;
  reason?: string;
  resolution?: string;
  notes?: string;
  requesterId?: string;
  addresseeId?: string;
}

export const NotificationService = {
  /**
   * Dispatches transactional email notifications based on lifecycle events.
   * Safe execution: Wraps SendGrid service errors to prevent them from breaking the calling transaction.
   */
  async notify(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    try {
      const { projectId, feedback, reason, resolution, notes, requesterId, addresseeId } = payload;

      let project = null;
      let clientEmail: string | null = null;
      let freelancerEmail: string | null = null;
      let clientName = "Client";
      let freelancerName = "Freelancer";
      let projectTitle = "";
      let projectLink = "";

      if (projectId) {
        project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            client: true,
            freelancer: true,
          },
        });

        if (project) {
          clientEmail = project.client?.email || null;
          freelancerEmail = project.freelancer?.email || null;
          clientName = project.client?.name || "Client";
          freelancerName = project.freelancer?.name || "Freelancer";
          projectTitle = project.title;
          projectLink = `http://localhost:3000/projects/${project.id}`;
        } else {
          console.warn(`[Notification WARNING] Project ${projectId} not found.`);
        }
      }

      switch (event) {
        case "PAYMENT_RECEIVED": {
          if (clientEmail) {
            await SendGridService.sendPaymentReceived(clientEmail, clientName, projectTitle, projectLink, true);
          }
          if (freelancerEmail) {
            await SendGridService.sendPaymentReceived(freelancerEmail, freelancerName, projectTitle, projectLink, false);
          }
          break;
        }

        case "FREELANCER_ASSIGNED": {
          if (freelancerEmail) {
            await SendGridService.sendFreelancerAssigned(freelancerEmail, freelancerName, projectTitle, projectLink);
          }
          break;
        }

        case "WORK_SUBMITTED": {
          if (clientEmail) {
            await SendGridService.sendWorkSubmitted(clientEmail, clientName, projectTitle, projectLink);
          }
          break;
        }

        case "CHANGES_REQUESTED": {
          if (freelancerEmail) {
            await SendGridService.sendChangesRequested(freelancerEmail, freelancerName, projectTitle, projectLink, feedback || "No feedback details provided.");
          }
          break;
        }

        case "DISPUTE_RAISED": {
          if (clientEmail) {
            await SendGridService.sendDisputeRaised(clientEmail, clientName, projectTitle, projectLink, reason || "No reason provided.");
          }
          if (freelancerEmail) {
            await SendGridService.sendDisputeRaised(freelancerEmail, freelancerName, projectTitle, projectLink, reason || "No reason provided.");
          }

          // Notify all admins
          try {
            const admins = await prisma.user.findMany({
              where: { role: "ADMIN" },
              select: { email: true, name: true },
            });
            for (const admin of admins) {
              if (admin.email) {
                await SendGridService.sendDisputeRaised(admin.email, admin.name || "Administrator", projectTitle, projectLink, reason || "No reason provided.");
              }
            }
          } catch (adminErr) {
            console.warn(`[Notification WARNING] Failed to fetch admins for dispute notification: ${adminErr}`);
          }
          break;
        }

        case "DISPUTE_RESOLVED": {
          if (clientEmail) {
            await SendGridService.sendDisputeResolved(clientEmail, clientName, projectTitle, projectLink, resolution || "No resolution provided.", notes || "No notes provided.");
          }
          if (freelancerEmail) {
            await SendGridService.sendDisputeResolved(freelancerEmail, freelancerName, projectTitle, projectLink, resolution || "No resolution provided.", notes || "No notes provided.");
          }
          break;
        }

        case "PAYMENT_RELEASED": {
          if (freelancerEmail) {
            await SendGridService.sendPaymentReleased(freelancerEmail, freelancerName, projectTitle, projectLink);
          }
          break;
        }

        case "REFUND_ISSUED": {
          if (clientEmail) {
            await SendGridService.sendRefundIssued(clientEmail, clientName, projectTitle, projectLink);
          }
          break;
        }

        case "AUTO_RELEASE_WARNING": {
          if (clientEmail) {
            await SendGridService.sendAutoReleaseWarning(clientEmail, clientName, projectTitle, projectLink);
          }
          if (freelancerEmail) {
            await SendGridService.sendAutoReleaseWarning(freelancerEmail, freelancerName, projectTitle, projectLink);
          }
          break;
        }

        case "PROPOSAL_SUBMITTED": {
          if (clientEmail) {
            await SendGridService.sendProposalSubmitted(clientEmail, clientName, projectTitle, projectLink);
          }
          break;
        }

        case "CONNECTION_REQUEST_RECEIVED": {
          if (requesterId && addresseeId) {
            const requester = await prisma.user.findUnique({ where: { id: requesterId } });
            const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
            if (requester && addressee && addressee.email) {
              await SendGridService.sendConnectionRequestReceived(addressee.email, addressee.name || "User", requester.name || "User");
            }
          }
          break;
        }

        case "CONNECTION_ACCEPTED": {
          if (requesterId && addresseeId) {
            const requester = await prisma.user.findUnique({ where: { id: requesterId } });
            const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
            if (requester && addressee && requester.email) {
              await SendGridService.sendConnectionAccepted(requester.email, requester.name || "User", addressee.name || "User");
            }
          }
          break;
        }

        case "NEW_PROJECT_FROM_CONNECTION": {
          if (project && project.clientId && prisma.connection) {
            const connections = await prisma.connection.findMany({
              where: {
                status: "ACCEPTED",
                OR: [
                  { requesterId: project.clientId },
                  { addresseeId: project.clientId },
                ],
              },
            });
            const partnerIds = connections.map((c) =>
              c.requesterId === project.clientId ? c.addresseeId : c.requesterId
            );
            const partners = await prisma.user.findMany({
              where: {
                id: { in: partnerIds },
                role: "FREELANCER",
              },
              select: { email: true, name: true },
            });
            for (const partner of partners) {
              if (partner.email) {
                await SendGridService.sendNewProjectFromConnection(partner.email, partner.name || "Freelancer", clientName, projectTitle, projectLink);
              }
            }
          }
          break;
        }

        default:
          console.warn(`[Notification WARNING] Unknown event type: ${event}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Notification WARNING] Notification processing failed: ${msg}`);
    }
  },
};
export default NotificationService;
