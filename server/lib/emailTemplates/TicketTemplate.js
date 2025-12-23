// src/lib/emailTemplates/TicketTemplate.js
export function TicketTemplate({
  name = "Customer",
  eventTitle = "Your Event",
  eventDate = "TBD",
  eventTime = "TBD",
  eventVenue = "TBD",
  eventPosterUrl,
  tickets = [], // Ensure tickets is always an array
}) {
  // Sanitize tickets and provide defaults
  const safeTickets = Array.isArray(tickets)
    ? tickets.map(t => ({
        ticketType: t.ticketType || "GENERAL",
        quantity: Number(t.quantity) || 1,
        amount: t.amount || "FREE",
        codes: Array.isArray(t.codes) && t.codes.length > 0
          ? t.codes
          : Array.from({ length: t.quantity || 1 }, (_, i) => `TKT-${Date.now()}-${i + 1}`)
      }))
    : [];

  // Calculate total quantity for plural text
  const totalTickets = safeTickets.reduce((sum, t) => sum + t.quantity, 0);

  // Grand total calculation (handles "FREE")
  const grandTotal = safeTickets.reduce((sum, t) => {
    if (t.amount === "FREE" || t.amount === "0") return sum;
    const num = parseFloat(String(t.amount).replace(/[^0-9.-]/g, ""));
    return isNaN(num) ? sum : sum + (num * t.quantity);
  }, 0);
  const formattedGrandTotal = grandTotal === 0 ? "FREE" : `$${grandTotal.toFixed(2)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket${totalTickets > 1 ? 's' : ''} - ${eventTitle} | Sahm Ticket Hub</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05);">
          
          <!-- Gradient Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);padding:48px 32px;text-align:center;">
              <img src="https://sahmtickethub.online/logo-white.png" alt="Sahm Ticket Hub" width="180" style="display:block;margin:0 auto 24px;">
              <h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-0.5px;">
                Your Ticket${totalTickets > 1 ? 's are' : ' is'} Confirmed! 🎉
              </h1>
              <p style="font-size:16px;color:rgba(255,255,255,0.9);margin:12px 0 0;line-height:1.5;">
                Get ready for an unforgettable experience
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="font-size:16px;color:#475569;margin:0 0 20px;line-height:1.6;text-align:center;">
                Hi <strong style="color:#1e293b;">${name}</strong>,
              </p>
              <p style="font-size:16px;color:#475569;margin:0 0 32px;line-height:1.6;text-align:center;">
                Thank you for your purchase! Your ticket${totalTickets > 1 ? 's' : ''} for the event are ready. Scroll down to view them.
              </p>

              <!-- Event Poster -->
              ${eventPosterUrl ? `
              <div style="text-align:center;margin-bottom:32px;">
                <img src="${eventPosterUrl}" alt="${eventTitle} Poster" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
              </div>` : ''}

              <!-- Event Info -->
              <div style="background:#f8f9ff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;margin-bottom:32px;">
                <h2 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#1e293b;text-align:center;">
                  ${eventTitle}
                </h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding-bottom:16px;font-size:15px;color:#64748b;width:30px;vertical-align:top;">📅</td><td style="padding-bottom:16px;font-size:15px;color:#1e293b;"><strong>Date</strong></td><td style="padding-bottom:16px;font-size:15px;color:#334155;">${eventDate}</td></tr>
                  <tr><td style="padding-bottom:16px;font-size:15px;color:#64748b;vertical-align:top;">⏰</td><td style="padding-bottom:16px;font-size:15px;color:#1e293b;"><strong>Time</strong></td><td style="padding-bottom:16px;font-size:15px;color:#334155;">${eventTime}</td></tr>
                  <tr><td style="font-size:15px;color:#64748b;vertical-align:top;">📍</td><td style="font-size:15px;color:#1e293b;"><strong>Venue</strong></td><td style="font-size:15px;color:#334155;">${eventVenue}</td></tr>
                </table>
              </div>

              <!-- Purchase Summary -->
              <table role="presentation" width="100%" style="background:#f0f4ff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:40px;">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="font-size:15px;">
                      <tr style="background:rgba(124,58,237,0.1);">
                        <th align="left" style="color:#1e293b;font-weight:600;">Ticket Type</th>
                        <th align="center" style="color:#1e293b;font-weight:600;">Qty</th>
                        <th align="right" style="color:#1e293b;font-weight:600;">Amount</th>
                      </tr>
                      ${safeTickets.map(t => `
                      <tr>
                        <td style="color:#334155;">${t.ticketType}</td>
                        <td align="center" style="color:#334155;">${t.quantity}</td>
                        <td align="right" style="color:#334155;">${t.amount}</td>
                      </tr>
                      `).join('')}
                      <tr style="border-top:2px solid #7c3aed;">
                        <td colspan="2" align="right" style="font-weight:700;color:#1e293b;padding-top:12px;font-size:16px;">GRAND TOTAL</td>
                        <td align="right" style="font-weight:700;color:#7c3aed;padding-top:12px;font-size:16px;">${formattedGrandTotal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Quick View Tickets -->
              <div style="margin-top:40px;">
                <h3 style="text-align:center;font-size:18px;color:#1e293b;margin:0 0 32px;">
                  Quick View: Your Ticket${totalTickets > 1 ? 's' : ''}
                </h3>

                ${(safeTickets.flatMap(ticket => (ticket.codes || []).map((code, idx) => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}`;
                  return `
                  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:32px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                    <div style="text-align:center;">
                      <p style="margin:0 0 16px;font-size:14px;color:#64748b;">
                        <strong>${ticket.ticketType}</strong> — Ticket ${idx + 1} of ${ticket.quantity}
                      </p>
                      <div style="
                        display:inline-block;
                        background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);
                        color:#ffffff;
                        font-size:26px;
                        font-weight:700;
                        letter-spacing:5px;
                        padding:16px 32px;
                        border-radius:12px;
                        margin-bottom:24px;
                        box-shadow:0 8px 20px rgba(124,58,237,0.3);
                      ">
                        ${code}
                      </div>
                      <br>
                      <img src="${qrUrl}" alt="QR Code for ${code}" style="width:200px;height:200px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                      <p style="margin:20px 0 0;font-size:14px;color:#64748b;">
                        Scan this QR code or show the ticket code at the entrance
                      </p>
                    </div>
                  </div>`;
                }))).join('')}
              </div>

              <p style="font-size:15px;color:#64748b;margin:40px 0 0;line-height:1.6;text-align:center;">
                Tickets are non-transferable ∙ Please arrive on time ∙ Bring valid ID if required
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="font-size:14px;color:#64748b;margin:0 0 12px;">
                Questions? Contact us at <a href="mailto:info@sahmtickethub.online" style="color:#7c3aed;text-decoration:none;font-weight:500;">info@sahmtickethub.online</a>
              </p>
              <p style="font-size:13px;color:#94a3b8;margin:0;">
                © 2025 Sahm Ticket Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" style="max-width:600px;margin-top:24px;">
          <tr>
            <td style="text-align:center;font-size:12px;color:#94a3b8;">
              This is an automated confirmation email — please do not reply.
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
