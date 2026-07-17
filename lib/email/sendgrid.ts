import sgMail from "@sendgrid/mail";
import { getBaseUrl } from "../utils/url";
import { Mailer } from "../notifications/mailer";

// Sane retry policy for transient errors (429, 5xx, or network timeouts)
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  triggerName: string,
  recipient: string,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err as { code?: string | number; message?: string; response?: { statusCode?: number } };
      // Check for transient codes or network issues
      const statusCode = error.code || error.response?.statusCode;
      const isTransient =
        statusCode === 429 ||
        (typeof statusCode === "number" && statusCode >= 500 && statusCode < 600) ||
        error.message?.includes("timeout") ||
        error.message?.includes("ESOCKETTIMEDOUT") ||
        error.code === "ETIMEDOUT";

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }

      console.warn(
        `[SendGrid WARNING] Attempt ${attempt} failed for trigger "${triggerName}" to ${recipient}. ` +
          `Transient error (status: ${statusCode || "unknown"}). Retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error("Retry bounds exceeded");
}

// Low-level helper to send mail via SendGrid with SMTP and console fallbacks
async function sendMailHelper(
  triggerName: string,
  to: string,
  subject: string,
  text: string,
  buttonText?: string,
  buttonUrl?: string
): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SendGrid ERROR] SENDGRID_API_KEY is missing");
      return false;
    }
    throw new Error("SENDGRID_API_KEY is missing");
  }
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "trustlance.noreply@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "TrustLance";

  const buttonHtml = buttonText && buttonUrl
    ? `<div style="margin-top: 24px;">
         <a href="${buttonUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 14px;">${buttonText}</a>
       </div>`
    : "";

  const htmlContent = `
    <div style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: bold; color: #1e1b4b; letter-spacing: -0.025em;">
          Trust<span style="color: #4f46e5;">Lance</span>
        </span>
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;">
        ${text}
      </div>
      ${buttonHtml}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
        © 2026 TrustLance. Secure Escrow Freelance Workspace. All rights reserved.
      </div>
    </div>
  `;

  // Try SendGrid if API key is provided
  if (apiKey && fromAddress) {
    try {
      sgMail.setApiKey(apiKey);
      const msg = {
        to,
        from: {
          email: fromAddress,
          name: fromName,
        },
        subject,
        text,
        html: htmlContent,
      };

      await retryWithBackoff(
        () => sgMail.send(msg),
        triggerName,
        to
      );
      return true;
    } catch (err: unknown) {
      const error = err as { code?: string | number; message?: string; response?: { statusCode?: number; body?: unknown } };
      const statusCode = error.response?.statusCode || error.code;
      const responseBody = JSON.stringify(error.response?.body || error.message || error);

      console.warn(
        `[SendGrid ERROR] Delivery failed for trigger "${triggerName}" to recipient "${to}" via SendGrid (Status: ${statusCode || "unknown"}). ` +
        `Attempting SMTP fallback...`
      );

      // SMTP Fallback inside SendGrid catch
      const smtpSent = await Mailer.sendEmail(to, subject, text, htmlContent);
      if (smtpSent) {
        console.info(`[Mailer INFO] Fallback SMTP email successfully sent to ${to} for trigger "${triggerName}".`);
        return true;
      }

      console.error(`[Mailer ERROR] Final delivery failure for trigger "${triggerName}" to recipient "${to}". Both SendGrid and SMTP fallbacks failed.`);
      return false;
    }
  }

  // Fallback 1: SMTP Nodemailer (Only called if API key was missing)
  const smtpSent = await Mailer.sendEmail(to, subject, text, htmlContent);
  if (smtpSent) {
    console.info(`[Mailer INFO] Fallback SMTP email successfully sent to ${to} for trigger "${triggerName}".`);
    return true;
  }

  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    console.error(`[Mailer ERROR] Final delivery failure for trigger "${triggerName}" to recipient "${to}". Both SendGrid and SMTP fallbacks failed.`);
    return false;
  }

  // Fallback 2: Console simulation log (so it is workable in local environment/sandbox without key constraints)
  console.log(
    `\n[MOCK EMAIL SIMULATION LOG]\n` +
    `========================================================================\n` +
    `To: ${to}\n` +
    `From: ${fromName} <${fromAddress}>\n` +
    `Subject: ${subject}\n` +
    `Text Body:\n${text}\n` +
    `========================================================================\n`
  );
  return true;
}

export const SendGridService = {
  async sendPaymentReceived(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string,
    isClient: boolean,
    amount?: number,
    paymentStatus?: string,
    escrowStatus?: string,
    clientName?: string
  ): Promise<boolean> {
    if (isClient) {
      const subject = "Payment Received Successfully";
      const text = `Hello ${recipientName},\n\n` +
        `We have successfully received your payment for the project: ${projectTitle}.\n\n` +
        `Details:\n` +
        `- Project Name: ${projectTitle}\n` +
        `- Amount: INR ${amount || "N/A"}\n` +
        `- Payment Status: ${paymentStatus || "SUCCESS"}\n` +
        `- Escrow Status: ${escrowStatus || "HOLDING"}`;

      return sendMailHelper("PAYMENT_RECEIVED", to, subject, text, "View Project", projectLink);
    } else {
      const subject = "Project Funded — You Can Start Working";
      const text = `Hello ${recipientName},\n\n` +
        `Great news! The client (${clientName || "Client"}) has funded the escrow container for project: ${projectTitle}.\n\n` +
        `Details:\n` +
        `- Project Name: ${projectTitle}\n` +
        `- Client Name: ${clientName || "Client"}\n` +
        `- Escrow Status: ${escrowStatus || "HOLDING"}\n\n` +
        `You are cleared to start working on the deliverables now.`;

      return sendMailHelper("PROJECT_FUNDED", to, subject, text, "Start Working", projectLink);
    }
  },

  async sendFreelancerAssigned(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] You have been assigned to project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nYou have been selected and assigned as the freelancer for project: ${projectTitle}.\n\nView details: ${projectLink}`;

    return sendMailHelper("FREELANCER_ASSIGNED", to, subject, text);
  },

  async sendWorkSubmitted(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Deliverables submitted for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nThe freelancer has submitted work deliverables for project: ${projectTitle}. Please review the submission.\n\nView details: ${projectLink}`;

    return sendMailHelper("WORK_SUBMITTED", to, subject, text);
  },

  async sendChangesRequested(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string,
    feedback: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Changes requested for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nThe client has requested changes on your submission for project: ${projectTitle}.\n\nFeedback:\n${
      feedback || "No feedback details provided."
    }\n\nView details: ${projectLink}`;

    return sendMailHelper("CHANGES_REQUESTED", to, subject, text);
  },

  async sendDisputeRaised(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string,
    reason: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Dispute raised for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nA dispute has been raised for project: ${projectTitle}.\n\nReason: ${
      reason || "No reason provided."
    }\n\nView details: ${projectLink}`;

    return sendMailHelper("DISPUTE_RAISED", to, subject, text);
  },

  async sendDisputeResolved(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string,
    resolution: string,
    notes: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Dispute resolved for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nThe dispute for project: ${projectTitle} has been resolved by an administrator.\n\nResolution: ${resolution}\nNotes:\n${
      notes || "No notes provided."
    }\n\nView details: ${projectLink}`;

    return sendMailHelper("DISPUTE_RESOLVED", to, subject, text);
  },

  async sendPaymentReleased(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Payment released for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nThe escrow payment has been successfully released to you for project: ${projectTitle}.\n\nView details: ${projectLink}`;

    return sendMailHelper("PAYMENT_RELEASED", to, subject, text);
  },

  async sendRefundIssued(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Refund issued for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nThe escrow payment has been successfully refunded to you for project: ${projectTitle}.\n\nView details: ${projectLink}`;

    return sendMailHelper("REFUND_ISSUED", to, subject, text);
  },

  async sendAutoReleaseWarning(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Action Required: Auto-release warning for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nThe submitted deliverables for project: ${projectTitle} have been under review. The funds held in escrow will be automatically released to the freelancer in 24 hours unless the client requests changes or raises a dispute.\n\nView project: ${projectLink}`;

    return sendMailHelper("AUTO_RELEASE_WARNING", to, subject, text);
  },

  async sendProposalSubmitted(
    to: string,
    recipientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] New proposal submitted for project: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\nA freelancer has submitted a new proposal on your project: ${projectTitle}.\n\nView details: ${projectLink}`;

    return sendMailHelper("PROPOSAL_SUBMITTED", to, subject, text);
  },

  async sendConnectionRequestReceived(
    to: string,
    recipientName: string,
    requesterName: string
  ): Promise<boolean> {
    const subject = `[TrustLance] New connection request from ${requesterName}`;
    const text = `Hello ${recipientName},\n\n${requesterName} has sent you a connection request on TrustLance.\n\nView pending requests: ${getBaseUrl()}/connections`;

    return sendMailHelper("CONNECTION_REQUEST_RECEIVED", to, subject, text);
  },

  async sendConnectionAccepted(
    to: string,
    recipientName: string,
    addresseeName: string
  ): Promise<boolean> {
    const subject = `[TrustLance] Connection request accepted by ${addresseeName}`;
    const text = `Hello ${recipientName},\n\nGood news! ${addresseeName} has accepted your connection request on TrustLance.\n\nView your connections: ${getBaseUrl()}/connections`;

    return sendMailHelper("CONNECTION_ACCEPTED", to, subject, text);
  },

  async sendNewProjectFromConnection(
    to: string,
    recipientName: string,
    clientName: string,
    projectTitle: string,
    projectLink: string
  ): Promise<boolean> {
    const subject = `[TrustLance] New project from connection: ${projectTitle}`;
    const text = `Hello ${recipientName},\n\n${clientName} has posted a new open project: ${projectTitle}.\n\nView details: ${projectLink}`;

    return sendMailHelper("NEW_PROJECT_FROM_CONNECTION", to, subject, text);
  },

  async sendWelcomeEmail(
    to: string,
    recipientName: string,
    role: string
  ): Promise<boolean> {
    const subject = `Welcome to TrustLance, ${recipientName}!`;
    const text = role === "CLIENT"
      ? `Hello ${recipientName},\n\nWelcome to TrustLance! We are thrilled to have you onboard.\n\nAs a Client, you can now post open projects, review freelancer bids, secure your funds safely in escrow milestone containers, and connect with top-tier talent with institutional-grade security.\n\nGet started by posting your first project: ${getBaseUrl()}/client/projects/new`
      : `Hello ${recipientName},\n\nWelcome to TrustLance! We are thrilled to have you onboard.\n\nAs a Freelancer, you can now build your professional reputation profile, browse premium client contracts, submit proposals, protect your work via milestone escrow agreements, and build trust-based connections.\n\nGet started by finding work opportunities: ${getBaseUrl()}/projects`;

    return sendMailHelper("WELCOME_ONBOARDING", to, subject, text);
  },
};
export default SendGridService;
