// src/lib/emailTemplates/EventCreatedTemplate.js
export function EventCreatedTemplate({
  organizerName,
  eventTitle,
  eventDate,
  eventTime,
  eventVenue,
  eventCity,
  eventPrice,
  eventUrl,
}) {
  const greeting = organizerName ? `Hi ${organizerName},` : "Hello,";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Event is Live on Sahm Ticket Hub</title>
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
                Your Event is Live! 🎉
              </h1>
              <p style="font-size: 16px; color: rgba(255, 255, 255, 0.9); margin: 12px 0 0; line-height: 1.5;">
                Congratulations — your event has been successfully published.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="font-size: 16px; color: #475569; margin: 0 0 20px; line-height: 1.6;">
                ${greeting}
              </p>
              <p style="font-size: 16px; color: #475569; margin: 0 0 32px; line-height: 1.6;">
                We're excited to let you know that your event <strong style="color: #1e293b;">${eventTitle}</strong> has been successfully created and is now live on Sahm Ticket Hub. Attendees can start discovering and purchasing tickets right away.
              </p>

              <!-- Event Details Card -->
              <table role="presentation" width="100%" style="background-color: #f8f9ff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #64748b; width: 30px; vertical-align: top;">📅</td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #1e293b;"><strong>Date</strong></td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #334155;">${eventDate}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #64748b; vertical-align: top;">⏰</td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #1e293b;"><strong>Time</strong></td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #334155;">${eventTime || "To be announced"}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #64748b; vertical-align: top;">📍</td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #1e293b;"><strong>Venue</strong></td>
                        <td style="padding-bottom: 12px; font-size: 15px; color: #334155;">${eventVenue}, ${eventCity}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #64748b; vertical-align: top;">💰</td>
                        <td style="font-size: 15px; color: #1e293b;"><strong>Price</strong></td>
                        <td style="font-size: 15px; color: #334155;">${eventPrice || "Free"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              ${eventUrl ? `
                <table role="presentation" width="100%" style="margin-top: 32px;">
                  <tr>
                    <td align="center">
                      <a href="${eventUrl}" style="
                        display: inline-block;
                        background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
                        color: #ffffff;
                        font-weight: 600;
                        font-size: 16px;
                        padding: 14px 32px;
                        border-radius: 12px;
                        text-decoration: none;
                        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
                      ">View Your Event</a>
                    </td>
                  </tr>
                </table>
              ` : ''}

              <p style="font-size: 15px; color: #64748b; margin: 32px 0 0; line-height: 1.6;">
                You can manage your event, view analytics, and track ticket sales directly from your organizer dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
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
              This is an automated message — please do not reply directly to this email.
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