import nodemailer from "nodemailer";

let transporterInstance: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporterInstance && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transporterInstance = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // usually false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporterInstance;
};

export const Mailer = {
  /**
   * Sends a plain-text transactional email using Nodemailer with Gmail SMTP.
   * Encapsulates errors to prevent failures from blocking parent transactions.
   */
  async sendEmail(to: string | string[], subject: string, body: string): Promise<boolean> {
    const from = "TrustLance <trustlance.noreply@gmail.com>";
    const recipients = Array.isArray(to) ? to : [to];

    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.warn(
          `[Mailer WARNING] SMTP_USER or SMTP_PASSWORD is not configured. Email NOT sent to: ${recipients.join(
            ", "
          )}\n` +
            `Subject: ${subject}\n` +
            `Body: ${body}`
        );
        return false;
      }

      await transporter.sendMail({
        from,
        to: recipients,
        subject,
        text: body,
      });

      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[Mailer WARNING] Failed to send email to ${recipients.join(", ")}: ${msg}`);
      return false;
    }
  },
};
export default Mailer;
