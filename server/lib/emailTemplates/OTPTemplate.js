// src/lib/emailTemplates/OTPTemplate.js

export function OTPTemplate({ name, otp, expiresIn }) {
  const userName = name || "Organizer";
  const expiry = expiresIn || 5;

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="https://sahmtickethub.online/logo-white.png" alt="Sahm Ticket Hub" style="max-width: 140px; margin-bottom: 16px;" />
        <h1 style="font-size: 26px; font-weight: 900; margin: 0; color: #111827; line-height: 1.2;">
          Welcome to Sahm Ticket Hub!
        </h1>
        <p style="font-size: 18px; color: #6b7280; margin: 12px 0;">
          You're one step away from creating amazing events
        </p>
      </div>

      <p style="color: #374151; font-size: 16px; line-height: 1.7; text-align: center; margin: 24px 0;">
        Hi <strong>${userName}</strong>,<br/><br/>
        Thank you for joining <strong>Sahm Ticket Hub</strong>! Use the code below to verify your account:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <div style="
          display: inline-block;
          padding: 18px 32px;
          background: linear-gradient(90deg,#7c3aed,#ec4899);
          color: white;
          border-radius: 16px;
          font-size: 36px;
          font-weight: 900;
          letter-spacing: 8px;
        ">
          ${otp}
        </div>
      </div>

      <p style="color: #374151; font-size: 15px; text-align: center; margin: 32px 0;">
        This code expires in <strong>${expiry} minutes</strong>.
      </p>
    </div>
  `;
}
