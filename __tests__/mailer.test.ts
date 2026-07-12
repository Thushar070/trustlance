import nodemailer from "nodemailer";
import { Mailer } from "@/lib/notifications/mailer";

// Mock nodemailer
jest.mock("nodemailer", () => {
  const sendMailMock = jest.fn().mockResolvedValue({ messageId: "mock_id" });
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    }),
  };
});

describe("Nodemailer Mailer Transporter Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup env vars
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "trustlance.noreply@gmail.com";
    process.env.SMTP_PASSWORD = "mocked_password";
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
  });

  it("should initialize the transporter and send an email via Nodemailer transport", async () => {
    const mockSendMail = (nodemailer.createTransport() as unknown as { sendMail: jest.Mock }).sendMail;

    const result = await Mailer.sendEmail("recipient@test.com", "Test Subject", "Test Body");

    expect(result).toBe(true);
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "trustlance.noreply@gmail.com",
        pass: "mocked_password",
      },
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "TrustLance <trustlance.noreply@gmail.com>",
      to: ["recipient@test.com"],
      subject: "Test Subject",
      text: "Test Body",
    });
  });

  it("should fail gracefully and log a warning if transporter fails to send mail", async () => {
    const mockSendMail = (nodemailer.createTransport() as unknown as { sendMail: jest.Mock }).sendMail;
    mockSendMail.mockRejectedValueOnce(new Error("SMTP connection error"));

    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    const result = await Mailer.sendEmail("recipient@test.com", "Test Subject", "Test Body");

    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to send email to recipient@test.com: SMTP connection error")
    );

    consoleWarnSpy.mockRestore();
  });
});
