// src/lib/emailTemplates/NewsletterTemplate.js
export function NewsletterTemplate({
  name,
  title,
  content,
  ctaText,
  ctaUrl,
}) {
  const greeting = name ? `Hi ${name},` : "Hello,";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Sahm Ticket Hub Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 48px 32px; text-align: center;">
              <img src="https://sahmtickethub.online/logo-white.png" alt="Sahm Ticket Hub" width="180" style="display: block; margin: 0 auto 24px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.5px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="font-size: 16px; color: #475569; margin: 0 0 20px; line-height: 1.6;">
                ${greeting}
              </p>

              <!-- Newsletter Content -->
              <div style="font-size: 16px; line-height: 1.7; color: #334155;">
                ${content}
              </div>

              <!-- CTA Button -->
              ${ctaText && ctaUrl ? `
                <table role="presentation" width="100%" style="margin-top: 40px;">
                  <tr>
                    <td align="center">
                      <a href="${ctaUrl}" style="
                        display: inline-block;
                        background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
                        color: #ffffff;
                        font-weight: 600;
                        font-size: 16px;
                        padding: 16px 36px;
                        border-radius: 12px;
                        text-decoration: none;
                        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
                      ">
                        ${ctaText}
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}

              <p style="font-size: 15px; color: #64748b; margin: 40px 0 0; line-height: 1.6;">
                Thank you for being part of the Sahm Ticket Hub community. We’re excited to help you discover and create amazing events!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 12px;">
                Want to adjust your email preferences? 
                <a href="#" style="color: #7c3aed; text-decoration: none; font-weight: 500;">Unsubscribe</a> or 
                <a href="#" style="color: #7c3aed; text-decoration: none; font-weight: 500;">manage settings</a>.
              </p>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 12px;">
                Questions? Contact us at 
                <a href="mailto:info@sahmtickethub.online" style="color: #7c3aed; text-decoration: none; font-weight: 500;">info@sahmtickethub.online</a>
              </p>
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                © 2025 Sahm Ticket Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

        <!-- Sub Footer -->
        <table role="presentation" width="100%" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td style="text-align: center; font-size: 12px; color: #94a3b8;">
              This email was sent by Sahm Ticket Hub. You are receiving this because you signed up for our newsletter.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}