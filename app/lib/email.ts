import "server-only";

import { Resend } from "resend";

type AuthEmail = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  url: string;
};

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured before auth emails can be sent.`);
  }

  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

async function sendAuthEmail({
  to,
  subject,
  heading,
  message,
  actionLabel,
  url,
}: AuthEmail) {
  const resend = new Resend(requiredEnvironmentVariable("RESEND_API_KEY"));
  const from = requiredEnvironmentVariable("AUTH_EMAIL_FROM");
  const safeUrl = escapeHtml(url);

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text: `${message}\n\n${actionLabel}: ${url}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.`,
    html: [
      `<h1>${heading}</h1>`,
      `<p>${message}</p>`,
      `<p><a href="${safeUrl}">${actionLabel}</a></p>`,
      "<p>This link expires in one hour. If you did not request this, you can ignore this email.</p>",
    ].join(""),
  });

  if (error) {
    throw new Error(`Resend could not send the authentication email: ${error.message}`);
  }
}

export function sendVerificationEmail(to: string, url: string) {
  return sendAuthEmail({
    to,
    url,
    subject: "Verify your email for Your Renting Helper",
    heading: "Verify your email",
    message: "Confirm that this email address belongs to you.",
    actionLabel: "Verify email",
  });
}

export function sendPasswordResetEmail(to: string, url: string) {
  return sendAuthEmail({
    to,
    url,
    subject: "Reset your password for Your Renting Helper",
    heading: "Reset your password",
    message: "Use the link below to choose a new password.",
    actionLabel: "Reset password",
  });
}
