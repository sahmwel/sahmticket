// src/lib/ticketsAPI.ts
export const API_URL = import.meta.env.VITE_API_URL || "https://api.sahmtickethub.online";

export async function validateTicket(qrData: string) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrData }),
    });

    if (!res.ok) throw new Error("Failed to validate ticket");

    return res.json(); // { valid, eventId, ticketType, scannedAt }
  } catch (err) {
    console.error("QR Validation Error:", err);
    throw err;
  }
}
