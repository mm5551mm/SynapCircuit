import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || "SynapCircuit <no-reply@synapcircuit.com>";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export type SendEmailResult = { delivered: boolean; reason?: "not_configured" | "send_failed" };

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === "production") {
      // In production, missing SMTP configuration is a real operational problem —
      // report it loudly instead of pretending the email was handled.
      console.error(
        `[MAIL:NOT_CONFIGURED] SMTP is not configured. Failed to send "${subject}" to ${to}. ` +
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to enable outbound email.",
      );
    } else {
      // No SMTP configured in development — log to console so the flow is still testable.
      console.log(`\n[MAIL:DEV] To: ${to}\nSubject: ${subject}\n${html}\n`);
    }
    return { delivered: false, reason: "not_configured" };
  }
  try {
    await t.sendMail({ from: MAIL_FROM, to, subject, html });
    return { delivered: true };
  } catch (err) {
    console.error(`Failed to send email to ${to} (subject: "${subject}")`, err);
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[MAIL:FALLBACK] To: ${to}\nSubject: ${subject}\n${html}\n`);
    }
    return { delivered: false, reason: "send_failed" };
  }
}

export function isEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export function verificationEmailHtml(name: string, link: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
    <h2 style="color:#7c3aed">Welcome to SynapCircuit, ${name}!</h2>
    <p>Please verify your email address to activate your account.</p>
    <p><a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Verify Email</a></p>
    <p>Or copy this link: ${link}</p>
  </div>`;
}

export function resetPasswordEmailHtml(name: string, link: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
    <h2 style="color:#7c3aed">Password reset requested</h2>
    <p>Hi ${name}, click below to reset your SynapCircuit password. This link expires in 1 hour.</p>
    <p><a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
    <p>Or copy this link: ${link}</p>
    <p>If you didn't request this, you can ignore this email.</p>
  </div>`;
}

export function orderConfirmationEmailHtml(name: string, orderNumber: string, total: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
    <h2 style="color:#7c3aed">Thanks for your order, ${name}!</h2>
    <p>Your order <b>${orderNumber}</b> has been placed successfully. Total: <b>${total}</b></p>
    <p>We'll notify you as soon as it ships.</p>
  </div>`;
}
