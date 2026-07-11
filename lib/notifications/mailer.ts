import { Resend } from "resend";

let resendInstance: Resend | null = null;

const getResend = () => {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
};

export const Mailer = {
  /**
   * Sends a plain-text transactional email using Resend.
   * Encapsulates errors to prevent failures from blocking parent transactions.
   */
  async sendEmail(to: string | string[], subject: string, body: string): Promise<boolean> {
    const from = "TrustLance (Dev) <onboarding@resend.dev>";
    const recipients = Array.isArray(to) ? to : [to];

    try {
      const resend = getResend();
      if (!resend) {
        console.warn(
          `[Mailer WARNING] RESEND_API_KEY is not configured. Email NOT sent to: ${recipients.join(
            ", "
          )}\n` +
            `Subject: ${subject}\n` +
            `Body: ${body}`
        );
        return false;
      }

      const response = await resend.emails.send({
        from,
        to: recipients,
        subject,
        text: body,
      });

      if (response.error) {
        console.warn(
          `[Mailer WARNING] Resend API returned an error: ${JSON.stringify(response.error)}`
        );
        return false;
      }

      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[Mailer WARNING] Failed to send email to ${recipients.join(", ")}: ${msg}`);
      return false;
    }
  },
};
export default Mailer;
