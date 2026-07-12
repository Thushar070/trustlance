import { prisma } from "../prisma";
import { Mailer } from "../notifications/mailer";

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
   * Safe execution: Wraps mailer errors to prevent them from breaking the calling transaction.
   */
  async notify(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    try {
      const { projectId, feedback, reason, resolution, notes, requesterId, addresseeId } = payload;

      let project = null;
      let clientEmail: string | null = null;
      let freelancerEmail: string | null = null;
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
          projectTitle = project.title;
          projectLink = `http://localhost:3000/projects/${project.id}`;
        } else {
          console.warn(`[Notification WARNING] Project ${projectId} not found.`);
        }
      }

      switch (event) {
        case "PAYMENT_RECEIVED": {
          const subject = `[TrustLance] Payment received for project: ${projectTitle}`;
          const clientBody = `Payment has been successfully received and is now held in escrow for project: ${projectTitle}.\n\nView details: ${projectLink}`;
          const freelancerBody = `Payment has been received and held in escrow for project: ${projectTitle}. You can start working on the deliverables now.\n\nView details: ${projectLink}`;

          if (clientEmail) {
            await Mailer.sendEmail(clientEmail, subject, clientBody);
          }
          if (freelancerEmail) {
            await Mailer.sendEmail(freelancerEmail, subject, freelancerBody);
          }
          break;
        }

        case "FREELANCER_ASSIGNED": {
          if (freelancerEmail) {
            const subject = `[TrustLance] You have been assigned to project: ${projectTitle}`;
            const body = `You have been selected and assigned as the freelancer for project: ${projectTitle}.\n\nView details: ${projectLink}`;
            await Mailer.sendEmail(freelancerEmail, subject, body);
          }
          break;
        }

        case "WORK_SUBMITTED": {
          if (clientEmail) {
            const subject = `[TrustLance] Deliverables submitted for project: ${projectTitle}`;
            const body = `The freelancer has submitted work deliverables for project: ${projectTitle}. Please review the submission.\n\nView details: ${projectLink}`;
            await Mailer.sendEmail(clientEmail, subject, body);
          }
          break;
        }

        case "CHANGES_REQUESTED": {
          if (freelancerEmail) {
            const subject = `[TrustLance] Changes requested for project: ${projectTitle}`;
            const body = `The client has requested changes on your submission for project: ${projectTitle}.\n\nFeedback:\n${
              feedback || "No feedback details provided."
            }\n\nView details: ${projectLink}`;
            await Mailer.sendEmail(freelancerEmail, subject, body);
          }
          break;
        }

        case "DISPUTE_RAISED": {
          const subject = `[TrustLance] Dispute raised for project: ${projectTitle}`;
          const body = `A dispute has been raised for project: ${projectTitle}.\n\nReason: ${
            reason || "No reason provided."
          }\n\nView details: ${projectLink}`;

          // Notify both parties
          if (clientEmail) {
            await Mailer.sendEmail(clientEmail, subject, body);
          }
          if (freelancerEmail) {
            await Mailer.sendEmail(freelancerEmail, subject, body);
          }

          // Notify all admins
          try {
            const admins = await prisma.user.findMany({
              where: { role: "ADMIN" },
              select: { email: true },
            });
            const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[];
            if (adminEmails.length > 0) {
              await Mailer.sendEmail(adminEmails, subject, body);
            }
          } catch (adminErr) {
            console.warn(`[Notification WARNING] Failed to fetch admins for dispute notification: ${adminErr}`);
          }
          break;
        }

        case "DISPUTE_RESOLVED": {
          const subject = `[TrustLance] Dispute resolved for project: ${projectTitle}`;
          const body = `The dispute for project: ${projectTitle} has been resolved by an administrator.\n\nResolution: ${resolution}\nNotes:\n${
            notes || "No notes provided."
          }\n\nView details: ${projectLink}`;

          if (clientEmail) {
            await Mailer.sendEmail(clientEmail, subject, body);
          }
          if (freelancerEmail) {
            await Mailer.sendEmail(freelancerEmail, subject, body);
          }
          break;
        }

        case "PAYMENT_RELEASED": {
          if (freelancerEmail) {
            const subject = `[TrustLance] Payment released for project: ${projectTitle}`;
            const body = `The escrow payment has been successfully released to you for project: ${projectTitle}.\n\nView details: ${projectLink}`;
            await Mailer.sendEmail(freelancerEmail, subject, body);
          }
          break;
        }

        case "REFUND_ISSUED": {
          if (clientEmail) {
            const subject = `[TrustLance] Refund issued for project: ${projectTitle}`;
            const body = `The escrow payment has been successfully refunded to you for project: ${projectTitle}.\n\nView details: ${projectLink}`;
            await Mailer.sendEmail(clientEmail, subject, body);
          }
          break;
        }

        case "AUTO_RELEASE_WARNING": {
          const subject = `[TrustLance] Action Required: Auto-release warning for project: ${projectTitle}`;
          const body = `The submitted deliverables for project: ${projectTitle} have been under review. The funds held in escrow will be automatically released to the freelancer in 24 hours unless the client requests changes or raises a dispute.\n\nView project: ${projectLink}`;
          if (clientEmail) {
            await Mailer.sendEmail(clientEmail, subject, body);
          }
          if (freelancerEmail) {
            await Mailer.sendEmail(freelancerEmail, subject, body);
          }
          break;
        }

        case "PROPOSAL_SUBMITTED": {
          if (clientEmail) {
            const subject = `[TrustLance] New proposal submitted for project: ${projectTitle}`;
            const body = `A freelancer has submitted a new proposal on your project: ${projectTitle}.\n\nView details: ${projectLink}`;
            await Mailer.sendEmail(clientEmail, subject, body);
          }
          break;
        }

        case "CONNECTION_REQUEST_RECEIVED": {
          if (requesterId && addresseeId) {
            const requester = await prisma.user.findUnique({ where: { id: requesterId } });
            const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
            if (requester && addressee && addressee.email) {
              const subject = `[TrustLance] New connection request from ${requester.name}`;
              const body = `Hello ${addressee.name},\n\n${requester.name} has sent you a connection request on TrustLance.\n\nView pending requests: http://localhost:3000/connections`;
              await Mailer.sendEmail(addressee.email, subject, body);
            }
          }
          break;
        }

        case "CONNECTION_ACCEPTED": {
          if (requesterId && addresseeId) {
            const requester = await prisma.user.findUnique({ where: { id: requesterId } });
            const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
            if (requester && addressee && requester.email) {
              const subject = `[TrustLance] Connection request accepted by ${addressee.name}`;
              const body = `Hello ${requester.name},\n\nGood news! ${addressee.name} has accepted your connection request on TrustLance.\n\nView your connections: http://localhost:3000/connections`;
              await Mailer.sendEmail(requester.email, subject, body);
            }
          }
          break;
        }

        case "NEW_PROJECT_FROM_CONNECTION": {
          if (project && project.clientId && prisma.connection) {
            const clientName = project.client?.name || "A Client";
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
            const subject = `[TrustLance] New project from connection: ${projectTitle}`;
            for (const partner of partners) {
              if (partner.email) {
                const body = `Hello ${partner.name || "Freelancer"},\n\n${clientName} has posted a new open project: ${projectTitle}.\n\nView details: ${projectLink}`;
                await Mailer.sendEmail(partner.email, subject, body);
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
