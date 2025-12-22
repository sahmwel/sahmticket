// src/lib/emailTemplates/sendEmail.js

import { TicketTemplate } from "./TicketTemplate.js";
import { OTPTemplate } from "./OTPTemplate.js";
import { EventCreatedTemplate } from "./EventCreatedTemplate.js";
import { NewsletterTemplate } from "./NewsletterTemplate.js";
import { TicketPurchasedOrganizerTemplate } from "./TicketPurchasedOrganizerTemplate.js";
import { createTransporter } from "../../mailer/mailer.js";

/** Map email types to subjects */
const SUBJECTS = {
  ticket: (data) => `Your Ticket for ${data.eventTitle || "Event"}`,
  otp: () => "Welcome to Sahm Ticket Hub Account",
  event: () => "Your Event is Live on Sahm Ticket Hub!",
  newsletter: (data) => data.title || "Newsletter from Sahm Ticket Hub",
  ticketpurchased: (data) =>
    `New Sale: ${data.quantity || 1} Ticket${(data.quantity || 1) > 1 ? "s" : ""} for ${data.eventTitle}`,
};

/**
 * Send an email using Nodemailer transporter
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.type - Email type (ticket, otp, etc.)
 * @param {Object} [options.data={}] - Data for template rendering
 * @param {string} [options.fromAccountKey="noreply"] - Transporter key
 * @param {Array} [options.attachments=[]] - Array of attachments
 */
export async function sendEmail({
  to,
  type,
  data = {},
  fromAccountKey = "noreply",
  attachments = [],
}) {
  if (!to || !type) throw new Error("Email 'to' and 'type' are required");

  let html = "";
  let subject = data.subject || "";

  switch (type) {
    case "ticket":
      html = TicketTemplate(data);
      subject = subject || SUBJECTS.ticket(data);
      // ✅ Do NOT generate PDFs inside; rely on passed attachments
      break;
    case "otp":
      html = OTPTemplate(data);
      subject = subject || SUBJECTS.otp();
      break;
    case "event":
      html = EventCreatedTemplate(data);
      subject = subject || SUBJECTS.event();
      break;
    case "newsletter":
      html = NewsletterTemplate(data);
      subject = subject || SUBJECTS.newsletter(data);
      break;
    case "ticketpurchased":
      html = TicketPurchasedOrganizerTemplate(data);
      subject = subject || SUBJECTS.ticketpurchased(data);
      break;
    default:
      throw new Error(`Unsupported email type: ${type}`);
  }

  if (!subject) subject = "Notification from Sahm Ticket Hub";

  const transporter = createTransporter(fromAccountKey);

  try {
    const info = await transporter.sendMail({
      from: '"Sahm Ticket Hub" <no-reply@sahmtickethub.online>',
      to,
      subject,
      html,
      attachments,
      text: data.textFallback || "Please view this email in HTML mode for full details.",
    });

    console.log(`✅ Email sent to ${to} | Attachments: ${attachments.length}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err?.message || err);
    throw new Error(`Email delivery failed: ${err?.message || "Unknown error"}`);
  }
}
