// src/lib/emailTemplates/sendEmail.js

// Import templates - ensure these files exist
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

// Fallback templates in case imports fail
const FALLBACK_TEMPLATES = {
  ticket: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Ticket</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
        .ticket-info { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c3aed; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sahm Ticket Hub</h1>
        <h2>${data.eventTitle || "Your Event"}</h2>
      </div>
      <div class="content">
        <p>Hello ${data.name || "Customer"},</p>
        <p>Thank you for your purchase! Your ticket${data.quantity > 1 ? 's' : ''} are attached to this email.</p>
        
        <div class="ticket-info">
          <h3>Event Details</h3>
          <p><strong>Event:</strong> ${data.eventTitle || "N/A"}</p>
          <p><strong>Date:</strong> ${data.eventDate || "N/A"}</p>
          <p><strong>Time:</strong> ${data.eventTime || "N/A"}</p>
          <p><strong>Venue:</strong> ${data.eventVenue || "N/A"}</p>
          <p><strong>Ticket Type:</strong> ${data.ticketType || "General Admission"}</p>
          <p><strong>Quantity:</strong> ${data.quantity || 1}</p>
          <p><strong>Amount:</strong> ${data.amount || "FREE"}</p>
          ${data.orderId ? `<p><strong>Order ID:</strong> ${data.orderId}</p>` : ''}
        </div>
        
        <p>Please bring your attached PDF ticket and a valid ID to the event.</p>
        <p>If you have any questions, contact us at support@sahmtickethub.online</p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} Sahm Ticket Hub. All rights reserved.</p>
      </div>
    </body>
    </html>
  `,
  
  otp: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Sahm Ticket Hub</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed;">Welcome to Sahm Ticket Hub!</h1>
        </div>
        <p>Hello ${data.name || "User"},</p>
        <p>Thank you for creating an account with Sahm Ticket Hub.</p>
        ${data.otp ? `<p>Your verification code is: <strong style="font-size: 24px; color: #7c3aed;">${data.otp}</strong></p>` : ''}
        <p>This code will expire in 10 minutes.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            If you didn't create this account, please ignore this email or contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  // Add other fallback templates as needed
};

/**
 * Safely get template function
 */
function getTemplate(type, data) {
  try {
    switch (type) {
      case "ticket":
        return TicketTemplate ? TicketTemplate(data) : FALLBACK_TEMPLATES.ticket(data);
      case "otp":
        return OTPTemplate ? OTPTemplate(data) : FALLBACK_TEMPLATES.otp(data);
      case "event":
        return EventCreatedTemplate ? EventCreatedTemplate(data) : FALLBACK_TEMPLATES.ticket(data);
      case "newsletter":
        return NewsletterTemplate ? NewsletterTemplate(data) : FALLBACK_TEMPLATES.ticket(data);
      case "ticketpurchased":
        return TicketPurchasedOrganizerTemplate ? TicketPurchasedOrganizerTemplate(data) : FALLBACK_TEMPLATES.ticket(data);
      default:
        return FALLBACK_TEMPLATES.ticket(data);
    }
  } catch (error) {
    console.warn(`Template ${type} failed, using fallback:`, error.message);
    return FALLBACK_TEMPLATES.ticket(data);
  }
}

/**
 * Validate email parameters
 */
function validateEmailParams({ to, type, data = {} }) {
  if (!to) throw new Error("Recipient email (to) is required");
  if (!type) throw new Error("Email type is required");
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error(`Invalid email address: ${to}`);
  }
  
  // Validate required data based on type
  if (type === "ticket" && !data.eventTitle) {
    console.warn("Ticket email missing eventTitle");
  }
  
  return true;
}

/**
 * Process attachments to prevent memory issues
 */
function processAttachments(attachments = []) {
  if (!Array.isArray(attachments)) {
    console.warn("Attachments should be an array, received:", typeof attachments);
    return [];
  }
  
  // Limit attachments to prevent memory issues on shared hosting
  const MAX_ATTACHMENTS = 5;
  const MAX_SIZE_MB = 10; // 10MB total
  
  if (attachments.length > MAX_ATTACHMENTS) {
    console.warn(`Too many attachments (${attachments.length}), limiting to ${MAX_ATTACHMENTS}`);
    attachments = attachments.slice(0, MAX_ATTACHMENTS);
  }
  
  let totalSize = 0;
  const processed = [];
  
  for (const attachment of attachments) {
    try {
      if (attachment.content && attachment.content.length) {
        const sizeMB = attachment.content.length / (1024 * 1024);
        totalSize += sizeMB;
        
        if (totalSize > MAX_SIZE_MB) {
          console.warn(`Attachment total size (${totalSize.toFixed(2)}MB) exceeds limit, skipping remaining`);
          break;
        }
        
        // Ensure proper structure for nodemailer
        processed.push({
          filename: attachment.filename || `attachment_${Date.now()}.pdf`,
          content: attachment.content,
          contentType: attachment.contentType || 'application/pdf',
          encoding: 'base64'
        });
      }
    } catch (error) {
      console.warn("Failed to process attachment:", error.message);
    }
  }
  
  return processed;
}

/**
 * Send an email using Nodemailer transporter
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.type - Email type (ticket, otp, etc.)
 * @param {Object} [options.data={}] - Data for template rendering
 * @param {string} [options.fromAccountKey="noreply"] - Transporter key
 * @param {Array} [options.attachments=[]] - Array of attachments
 * @param {Object} [options.options={}] - Additional nodemailer options
 */
export async function sendEmail({
  to,
  type,
  data = {},
  fromAccountKey = "noreply",
  attachments = [],
  options = {}
}) {
  try {
    // Validate parameters
    validateEmailParams({ to, type, data });
    
    // Process attachments
    const processedAttachments = processAttachments(attachments);
    
    // Get email content
    let html = "";
    let subject = data.subject || "";
    
    html = getTemplate(type, data);
    subject = subject || (SUBJECTS[type] ? SUBJECTS[type](data) : "Notification from Sahm Ticket Hub");
    
    if (!subject) subject = "Notification from Sahm Ticket Hub";
    
    // Get transporter
    const transporter = createTransporter(fromAccountKey);
    if (!transporter) {
      throw new Error(`Failed to create transporter for key: ${fromAccountKey}`);
    }
    
    // Prepare email options
    const mailOptions = {
      from: options.from || '"Sahm Ticket Hub" <no-reply@sahmtickethub.online>',
      to,
      subject,
      html,
      attachments: processedAttachments,
      text: data.textFallback || `Please view this email in HTML mode for full details. ${type === 'ticket' ? 'Your ticket is attached.' : ''}`,
      ...options
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent to ${to} | Type: ${type} | Attachments: ${processedAttachments.length}`);
    
    // Log warning if some attachments were skipped
    if (processedAttachments.length < attachments.length) {
      console.warn(`Some attachments were skipped (${attachments.length} provided, ${processedAttachments.length} sent)`);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      attachmentsSent: processedAttachments.length,
      attachmentsSkipped: attachments.length - processedAttachments.length
    };
    
  } catch (err) {
    console.error(`❌ Failed to send ${type} email to ${to}:`, err?.message || err);
    
    // Return structured error for better handling
    throw {
      name: "EmailError",
      message: `Email delivery failed: ${err?.message || "Unknown error"}`,
      type,
      recipient: to,
      originalError: err
    };
  }
}

/**
 * Send bulk emails with rate limiting
 * @param {Array} emails - Array of email objects
 * @param {number} delayMs - Delay between emails in milliseconds
 */
export async function sendBulkEmails(emails, delayMs = 1000) {
  const results = [];
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      console.log(`Sending email ${i + 1}/${emails.length} to ${email.to}`);
      const result = await sendEmail(email);
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ success: false, error: error.message, to: email.to });
    }
    
    // Rate limiting
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}