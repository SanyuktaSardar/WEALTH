import nodemailer from "nodemailer";
import { Resend } from "resend";

function getFromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    (process.env.GMAIL_USER
      ? `Welth Finance <${process.env.GMAIL_USER}>`
      : process.env.SMTP_USER
        ? `Welth Finance <${process.env.SMTP_USER}>`
        : "Welth Finance <onboarding@resend.dev>")
  );
}

function createSmtpTransport() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendViaResend({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) return null;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
  });

  if (error) {
    const message =
      typeof error === "string" ? error : error?.message || JSON.stringify(error);
    console.warn("[mail] Resend error:", message);
    return { success: false, error: message };
  }

  return { success: true, provider: "resend", data };
}

async function sendViaSmtp({ to, subject, html, text }) {
  const transport = createSmtpTransport();
  if (!transport) return null;

  const info = await transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });

  return { success: true, provider: "smtp", data: info };
}

/**
 * Send email to any address (e.g. logged-in user).
 * Tries Resend if configured, then SMTP (Gmail/generic) — no Resend account required for SMTP.
 */
export async function deliverEmail({ to, subject, html, text }) {
  if (!to) {
    return { success: false, error: "Recipient email is required" };
  }
  if (!html && !text) {
    return { success: false, error: "Email body is required" };
  }

  // Prefer SMTP when configured (sends to any inbox without Resend verification)
  const smtpFirst = Boolean(
    process.env.SMTP_USER ||
      process.env.GMAIL_USER ||
      (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)
  );

  const tryOrder = smtpFirst
    ? [sendViaSmtp, sendViaResend]
    : [sendViaResend, sendViaSmtp];

  let lastError = null;

  for (const attempt of tryOrder) {
    try {
      const result = await attempt({ to, subject, html, text });
      if (result?.success) return result;
      if (result?.error) lastError = result.error;
    } catch (err) {
      lastError = err?.message || String(err);
      console.warn("[mail] Provider failed:", lastError);
    }
  }

  return {
    success: false,
    error:
      lastError ||
      "No email provider configured. Add GMAIL_USER + GMAIL_APP_PASSWORD (or SMTP_HOST, SMTP_USER, SMTP_PASS) to .env — no Resend account needed.",
  };
}

export function isEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY ||
      ((process.env.SMTP_USER || process.env.GMAIL_USER) &&
        (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD))
  );
}
