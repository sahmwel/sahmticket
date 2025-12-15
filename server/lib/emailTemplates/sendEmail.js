// src/lib/emailTemplates/sendEmail.js

import { TicketTemplate } from "./TicketTemplate.js";
import { OTPTemplate } from "./OTPTemplate.js";
import { EventCreatedTemplate } from "./EventCreatedTemplate.js";
import { NewsletterTemplate } from "./NewsletterTemplate.js";
import { TicketPurchasedOrganizerTemplate } from "./TicketPurchasedOrganizerTemplate.js";
import { createTransporter } from "../../mailer/mailer.js";
import { generateTicketPdf } from "../pdf/generateTicketPdf.js";

// Centralized subject mapping for consistency
const SUBJECTS = {
  ticket: (data) => `Your Ticket for ${data.eventTitle || "Event"}`,
  otp: () => "Verify Your Sahm Ticket Hub Account",
  event: () => "Your Event is Live on Sahm Ticket Hub!",
  newsletter: (data) => data.title || "Newsletter from Sahm Ticket Hub",
  ticketpurchased: (data) => 
    `New Sale: ${data.quantity || 1} Ticket${(data.quantity || 1) > 1 ? 's' : ''} for ${data.eventTitle}`,
};

export async function sendEmail({
  to,
  type,
  data = {},
  fromAccountKey = "noreply",
  attachments: externalAttachments = [],
}) {
  if (!to || !type) {
    throw new Error("Email 'to' and 'type' are required");
  }

  let html = "";
  let subject = data.subject || "";
  let attachments = [...externalAttachments];

  // Render HTML based on type
  switch (type) {
    case "ticket":
      html = TicketTemplate(data);
      subject = subject || SUBJECTS.ticket(data);

      // Auto-attach PDF for ticket emails
      if (typeof generateTicketPdf === "function") {
        try {
          const pdfBuffer = await generateTicketPdf(data);
          attachments.push({
            filename: `SahmTicket_${data.ticketCode || data.orderId || Date.now()}.pdf`,
            content: pdfBuffer, // Buffer works directly (Nodemailer handles base64)
            contentType: "application/pdf",
          });
          console.log("✅ PDF ticket attached successfully");
        } catch (pdfError) {
          console.warn("⚠️ Failed to generate PDF ticket:", pdfError.message || pdfError);
          // Continue sending email without PDF
        }
      }
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

  // Final subject fallback
  if (!subject) {
    subject = "Notification from Sahm Ticket Hub";
  }

  const transporter = createTransporter(fromAccountKey);

  try {
    const info = await transporter.sendMail({
      from: '"Sahm Ticket Hub" <no-reply@sahmtickethub.online>',
      to,
      subject,
      html,
      attachments,
      // Optional: Add text fallback for accessibility
      text: data.textFallback || "Please view this email in HTML mode for full details.",
    });

    console.log(`✅ Email sent successfully to ${to} | MessageId: ${info.messageId}`);
    if (attachments.length > 0) {
      console.log(`   📎 ${attachments.length} attachment(s) included`);
    }
    return info;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message || err);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
}